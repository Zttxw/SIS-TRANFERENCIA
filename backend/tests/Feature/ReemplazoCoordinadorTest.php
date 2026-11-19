<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\CronogramaActividad;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\Rol;
use Database\Seeders\RolesPermisosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * RF-15, RN-12, F-12 — Reemplazo de coordinador ETTE: revoca la designación
 * anterior sin borrarla, acredita al nuevo, deja constancia y no toca plazos.
 */
class ReemplazoCoordinadorTest extends TestCase
{
    use RefreshDatabase;

    private ProcesoTransferencia $proceso;

    private Dependencia $centro;

    private User $comite;

    private User $anterior;

    private AsignacionRol $designacion;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesPermisosSeeder::class);
        $this->proceso = ProcesoTransferencia::factory()->create(['estado' => 'abierto']);
        $this->centro = Dependencia::factory()->create(['proceso_transferencia_id' => $this->proceso->id, 'codigo' => '07.05']);
        $this->comite = User::factory()->create(['name' => 'Titular Comité']);
        AsignacionRol::factory()->rol(Rol::ETTE)->create([
            'user_id' => $this->comite->id,
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => null,
        ]);
        $this->anterior = User::factory()->create(['name' => 'Coordinador Saliente', 'dni' => '40000001']);
        $this->designacion = AsignacionRol::factory()->rol(Rol::DELEGADO_ETTE)->create([
            'user_id' => $this->anterior->id,
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->centro->id,
        ]);
    }

    public function test_el_reemplazo_revoca_al_anterior_acredita_al_nuevo_y_no_cambia_plazos(): void
    {
        $actividad = CronogramaActividad::factory()->create(['proceso_transferencia_id' => $this->proceso->id]);
        $plazo = $actividad->fresh()->only(['fecha_inicio', 'fecha_vencimiento', 'hora_vencimiento']);
        $nuevo = User::factory()->create(['name' => 'Coordinador Entrante']);
        Sanctum::actingAs($this->comite);

        $respuesta = $this->postJson("/api/delegados/{$this->designacion->id}/reemplazar", [
            'user_id' => $nuevo->id,
            'motivo' => 'Renuncia al equipo de transferencia.',
        ])->assertCreated()
            ->assertJsonPath('data.reemplaza_a_id', $this->designacion->id);

        $this->assertDatabaseHas('asignaciones_rol', [
            'id' => $respuesta->json('data.id'),
            'user_id' => $nuevo->id,
            'dependencia_id' => $this->centro->id,
            'motivo_reemplazo' => 'Renuncia al equipo de transferencia.',
            'acreditada_por_id' => $this->comite->id,
            'revocada_en' => null,
        ]);
        $this->assertDatabaseHas('asignaciones_rol', ['id' => $this->designacion->id, 'revocada_por_id' => $this->comite->id]);
        $this->assertFalse($this->anterior->fresh()->puedeAccederDependencia($this->centro->id));
        $this->assertTrue($nuevo->fresh()->puedeAccederDependencia($this->centro->id));
        $this->assertEquals($plazo, $actividad->fresh()->only(['fecha_inicio', 'fecha_vencimiento', 'hora_vencimiento']));
    }

    public function test_reemplazar_por_una_cuenta_externa_nueva(): void
    {
        Sanctum::actingAs($this->comite);

        $this->postJson("/api/delegados/{$this->designacion->id}/reemplazar", [
            'motivo' => 'Cambio dispuesto por el titular entrante.',
            'nuevo' => ['dni' => '48000000', 'name' => 'Externa Nueva', 'celular' => '984123456', 'password' => 'clave-segura-1'],
        ])->assertCreated();

        $cuenta = User::where('dni', '48000000')->firstOrFail();
        $this->assertSame('984123456', $cuenta->celular);
        $this->assertTrue($cuenta->tieneRol(Rol::DELEGADO_ETTE, $this->centro->id));
    }

    public function test_el_reemplazo_exige_motivo_y_otra_persona(): void
    {
        Sanctum::actingAs($this->comite);

        $this->postJson("/api/delegados/{$this->designacion->id}/reemplazar", ['user_id' => $this->anterior->id])
            ->assertStatus(422)->assertJsonValidationErrors('motivo');

        $this->postJson("/api/delegados/{$this->designacion->id}/reemplazar", [
            'user_id' => $this->anterior->id,
            'motivo' => 'Prueba de la misma persona.',
        ])->assertStatus(422)->assertJsonValidationErrors(['user_id' => 'El nuevo coordinador debe ser una persona distinta.']);

        $this->assertNull($this->designacion->fresh()->revocada_en);
    }

    public function test_una_designacion_ya_revocada_no_se_reemplaza_de_nuevo(): void
    {
        $this->designacion->update(['revocada_en' => now()]);
        Sanctum::actingAs($this->comite);

        $this->postJson("/api/delegados/{$this->designacion->id}/reemplazar", [
            'user_id' => User::factory()->create()->id,
            'motivo' => 'Intento sobre una designación revocada.',
        ])->assertStatus(422)->assertJsonValidationErrors('asignacion');
    }

    public function test_la_constancia_del_reemplazo_se_descarga_en_pdf(): void
    {
        Sanctum::actingAs($this->comite);
        $nueva = $this->postJson("/api/delegados/{$this->designacion->id}/reemplazar", [
            'user_id' => User::factory()->create()->id,
            'motivo' => 'Licencia prolongada del coordinador.',
        ])->json('data.id');

        $this->get("/api/delegados/{$nueva}/constancia-reemplazo/pdf")
            ->assertOk()->assertHeader('Content-Type', 'application/pdf');
        $this->get("/api/delegados/{$this->designacion->id}/constancia-reemplazo/pdf")->assertNotFound();
        $this->get('/api/delegados/relacion/pdf')->assertOk()->assertHeader('Content-Type', 'application/pdf');
    }

    public function test_el_responsable_del_cc_ve_el_reemplazo_reciente(): void
    {
        Sanctum::actingAs($this->comite);
        $this->postJson("/api/delegados/{$this->designacion->id}/reemplazar", [
            'user_id' => User::factory()->create(['name' => 'Coordinador Entrante'])->id,
            'motivo' => 'Renuncia al equipo de transferencia.',
        ])->assertCreated();

        $responsable = User::factory()->create();
        AsignacionRol::factory()->rol(Rol::RESPONSABLE_CENTRO_COSTO)->create([
            'user_id' => $responsable->id,
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->centro->id,
        ]);
        Sanctum::actingAs($responsable);

        $this->getJson('/api/coordinadores-ette/mis-centros')->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.coordinadores.0.nombre', 'Coordinador Entrante')
            ->assertJsonPath('data.0.reemplazos.0.anterior', 'Coordinador Saliente')
            ->assertJsonPath('data.0.reemplazos.0.motivo', 'Renuncia al equipo de transferencia.');
    }

    public function test_un_coordinador_no_puede_reemplazar(): void
    {
        Sanctum::actingAs($this->anterior);

        $this->postJson("/api/delegados/{$this->designacion->id}/reemplazar", [
            'user_id' => User::factory()->create()->id,
            'motivo' => 'Intento sin permiso del comité.',
        ])->assertForbidden();
    }
}

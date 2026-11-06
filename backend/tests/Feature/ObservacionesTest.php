<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Gestion\Models\InformeGestion;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\Entrega;
use App\Modules\Transferencia\Models\Observacion;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\EstadoEntrega;
use App\Support\Enums\EstadoObservacion;
use App\Support\Enums\Rol;
use Database\Seeders\RolesPermisosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Módulo de observaciones y subsanaciones (plan §7.9): el coordinador formula
 * observaciones concretas sobre anexos; el responsable las subsana; al subsanar
 * la última observación abierta de una entrega OBSERVADA, ésta se re-remite.
 */
class ObservacionesTest extends TestCase
{
    use RefreshDatabase;

    private ProcesoTransferencia $proceso;

    private Dependencia $padre;

    private Dependencia $hija;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesPermisosSeeder::class);
        $this->proceso = ProcesoTransferencia::factory()->create();
        $this->padre = Dependencia::factory()->create([
            'proceso_transferencia_id' => $this->proceso->id,
            'nivel' => 2,
        ]);
        $this->hija = Dependencia::factory()->hijaDe($this->padre)->create();
    }

    private function actuarComo(Rol $rol, ?Dependencia $dependencia): User
    {
        $usuario = User::factory()->create();
        AsignacionRol::factory()->rol($rol)->create([
            'user_id' => $usuario->id,
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $dependencia?->id,
        ]);
        Sanctum::actingAs($usuario);

        return $usuario;
    }

    private function informeDe(Dependencia $dep): InformeGestion
    {
        return InformeGestion::create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $dep->id,
            'principales_funciones' => 'Funciones de prueba del centro de costo.',
            'logros' => 'Logros de prueba del periodo evaluado.',
            'estado' => 'borrador',
        ]);
    }

    private function crearEntrega(Dependencia $dep, EstadoEntrega $estado): Entrega
    {
        return Entrega::create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $dep->id,
            'dependencia_destino_id' => $dep->parent_id,
            'estado' => $estado,
        ]);
    }

    public function test_coordinador_registra_observacion_sobre_anexo(): void
    {
        $informe = $this->informeDe($this->hija);
        // Coordinador con ámbito en el padre (incluye la hija).
        $this->actuarComo(Rol::COORDINADOR, $this->padre);

        $this->postJson('/api/observaciones', [
            'anexo' => 'gestion',
            'observable_id' => $informe->id,
            'descripcion' => 'El informe no detalla los asuntos pendientes.',
        ])->assertStatus(201)
            ->assertJsonPath('data.estado', EstadoObservacion::ABIERTA->value);

        $this->assertDatabaseHas('observaciones', [
            'observable_type' => InformeGestion::class,
            'observable_id' => $informe->id,
            'estado' => EstadoObservacion::ABIERTA->value,
        ]);
    }

    public function test_coordinador_no_observa_fuera_de_su_ambito(): void
    {
        $otraRama = Dependencia::factory()->create([
            'proceso_transferencia_id' => $this->proceso->id,
            'nivel' => 2,
        ]);
        $informe = $this->informeDe($otraRama);

        $this->actuarComo(Rol::COORDINADOR, $this->padre);

        $this->postJson('/api/observaciones', [
            'anexo' => 'gestion',
            'observable_id' => $informe->id,
            'descripcion' => 'Observación fuera de ámbito.',
        ])->assertForbidden();
    }

    public function test_servidor_no_puede_registrar_observaciones(): void
    {
        $informe = $this->informeDe($this->hija);
        $this->actuarComo(Rol::SERVIDOR, $this->hija);

        $this->postJson('/api/observaciones', [
            'anexo' => 'gestion',
            'observable_id' => $informe->id,
            'descripcion' => 'El servidor no tiene permiso para observar.',
        ])->assertForbidden();
    }

    public function test_subsanar_ultima_observacion_reremite_la_entrega(): void
    {
        $informe = $this->informeDe($this->hija);
        $entrega = $this->crearEntrega($this->hija, EstadoEntrega::OBSERVADA);

        // Coordinador observa.
        $coordinador = $this->actuarComo(Rol::COORDINADOR, $this->padre);
        $observacion = Observacion::create([
            'proceso_transferencia_id' => $this->proceso->id,
            'observable_type' => InformeGestion::class,
            'observable_id' => $informe->id,
            'autor_id' => $coordinador->id,
            'descripcion' => 'Corregir el informe.',
            'estado' => EstadoObservacion::ABIERTA,
        ]);

        // El responsable de la hija subsana.
        $this->actuarComo(Rol::SERVIDOR, $this->hija);
        $this->postJson("/api/observaciones/{$observacion->id}/subsanar", [
            'respuesta' => 'Se corrigió el informe según lo observado.',
        ])->assertOk()
            ->assertJsonPath('data.estado', EstadoObservacion::SUBSANADA->value);

        $entrega->refresh();
        $this->assertSame(EstadoEntrega::REMITIDA, $entrega->estado);
    }

    public function test_subsanar_no_reremite_si_quedan_observaciones_abiertas(): void
    {
        $informe = $this->informeDe($this->hija);
        $entrega = $this->crearEntrega($this->hija, EstadoEntrega::OBSERVADA);

        $coordinador = $this->actuarComo(Rol::COORDINADOR, $this->padre);
        $obs1 = Observacion::create([
            'proceso_transferencia_id' => $this->proceso->id,
            'observable_type' => InformeGestion::class,
            'observable_id' => $informe->id,
            'autor_id' => $coordinador->id,
            'descripcion' => 'Primera observación.',
            'estado' => EstadoObservacion::ABIERTA,
        ]);
        Observacion::create([
            'proceso_transferencia_id' => $this->proceso->id,
            'observable_type' => InformeGestion::class,
            'observable_id' => $informe->id,
            'autor_id' => $coordinador->id,
            'descripcion' => 'Segunda observación aún abierta.',
            'estado' => EstadoObservacion::ABIERTA,
        ]);

        $this->actuarComo(Rol::SERVIDOR, $this->hija);
        $this->postJson("/api/observaciones/{$obs1->id}/subsanar", [
            'respuesta' => 'Subsanada la primera.',
        ])->assertOk();

        $entrega->refresh();
        // Aún queda una observación abierta: la entrega sigue OBSERVADA.
        $this->assertSame(EstadoEntrega::OBSERVADA, $entrega->estado);
    }

    public function test_listado_de_observaciones_se_acota_al_ambito(): void
    {
        $informePropio = $this->informeDe($this->hija);
        $otraRama = Dependencia::factory()->create([
            'proceso_transferencia_id' => $this->proceso->id,
            'nivel' => 2,
        ]);
        $informeAjeno = $this->informeDe($otraRama);

        $coordinadorGlobal = User::factory()->create();
        AsignacionRol::factory()->rol(Rol::ETTS)->create([
            'user_id' => $coordinadorGlobal->id,
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => null,
        ]);
        foreach ([$informePropio, $informeAjeno] as $inf) {
            Observacion::create([
                'proceso_transferencia_id' => $this->proceso->id,
                'observable_type' => InformeGestion::class,
                'observable_id' => $inf->id,
                'autor_id' => $coordinadorGlobal->id,
                'descripcion' => 'Observación.',
                'estado' => EstadoObservacion::ABIERTA,
            ]);
        }

        // El responsable de la hija solo ve la observación de su rama.
        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->hija);
        $respuesta = $this->getJson('/api/observaciones')->assertOk();
        $this->assertCount(1, $respuesta->json('data'));
    }
}

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
use App\Support\Enums\CalidadEtte;
use App\Support\Enums\EstadoEntrega;
use App\Support\Enums\EstadoObservacion;
use App\Support\Enums\Rol;
use Database\Seeders\RolesPermisosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Concerns\PreparaEntregas;
use Tests\TestCase;

/**
 * Observaciones del coordinador ETTE (D-07): constancia sin subsanación. Se
 * registran sobre una fila o el anexo completo mientras la entrega está
 * presentada y sin aceptar, y no cambian su estado.
 */
class ObservacionesTest extends TestCase
{
    use PreparaEntregas, RefreshDatabase;

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
            'funciones' => [['n' => 1, 'descripcion' => 'Funciones de prueba del centro de costo.']],
            'logros_items' => [['n' => 1, 'actividad' => 'Logros de prueba del periodo evaluado.']],
            'estado' => 'borrador',
        ]);
    }

    private function observacionDe(Dependencia $dep): Observacion
    {
        return Observacion::create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $dep->id,
            'anexo' => 'gestion',
            'autor_id' => User::factory()->create()->id,
            'descripcion' => 'El informe no detalla los pendientes.',
            'estado' => EstadoObservacion::REGISTRADA,
        ]);
    }

    public function test_coordinador_observa_una_fila_sin_cambiar_el_estado_de_la_entrega(): void
    {
        $informe = $this->informeDe($this->hija);
        $this->entregaEn($this->hija, EstadoEntrega::EN_REVISION);
        $this->actuarComo(Rol::DELEGADO_ETTE, $this->hija);

        $this->postJson('/api/observaciones', [
            'anexo' => 'gestion',
            'observable_id' => $informe->id,
            'descripcion' => 'El informe no detalla los asuntos pendientes.',
        ])->assertCreated()
            ->assertJsonPath('data.estado', EstadoObservacion::REGISTRADA->value);

        $this->assertDatabaseHas('observaciones', [
            'observable_type' => InformeGestion::class,
            'observable_id' => $informe->id,
            'dependencia_id' => $this->hija->id,
            'anexo' => 'gestion',
            'en_calidad_de' => CalidadEtte::COORDINADOR->value,
        ]);
        $this->assertSame(EstadoEntrega::EN_REVISION, Entrega::where('dependencia_id', $this->hija->id)->value('estado'));
    }

    public function test_coordinador_observa_el_anexo_completo(): void
    {
        $this->entregaEn($this->hija, EstadoEntrega::EN_REVISION);
        $this->actuarComo(Rol::DELEGADO_ETTE, $this->hija);

        $this->postJson('/api/observaciones', [
            'anexo' => 'acervo',
            'dependencia_id' => $this->hija->id,
            'descripcion' => 'No se registró el archivo de gestión.',
        ])->assertCreated()->assertJsonPath('data.observable_id', null);

        $this->assertDatabaseHas('observaciones', ['dependencia_id' => $this->hija->id, 'anexo' => 'acervo', 'observable_id' => null]);
    }

    /** @return array<string, array{0: ?EstadoEntrega}> */
    public static function estadosNoObservables(): array
    {
        return [
            'sin presentar' => [null],
            'borrador' => [EstadoEntrega::BORRADOR],
            'aceptada' => [EstadoEntrega::VERIFICADA],
            'remitida' => [EstadoEntrega::REMITIDA],
        ];
    }

    #[DataProvider('estadosNoObservables')]
    public function test_solo_se_observa_una_entrega_presentada_y_sin_aceptar(?EstadoEntrega $estado): void
    {
        if ($estado !== null) {
            $this->entregaEn($this->hija, $estado);
        }
        $this->actuarComo(Rol::DELEGADO_ETTE, $this->hija);

        $this->postJson('/api/observaciones', [
            'anexo' => 'gestion',
            'dependencia_id' => $this->hija->id,
            'descripcion' => 'Observación fuera de revisión.',
        ])->assertConflict();

        $this->assertDatabaseCount('observaciones', 0);
    }

    public function test_coordinador_no_observa_fuera_del_cc_asignado(): void
    {
        $this->entregaEn($this->hija, EstadoEntrega::EN_REVISION);
        $this->actuarComo(Rol::DELEGADO_ETTE, $this->padre);

        $this->postJson('/api/observaciones', [
            'anexo' => 'gestion',
            'dependencia_id' => $this->hija->id,
            'descripcion' => 'Observación fuera de ámbito.',
        ])->assertForbidden();
    }

    public function test_titular_ette_observa_en_suplencia_solo_con_motivo(): void
    {
        $informe = $this->informeDe($this->hija);
        $this->entregaEn($this->hija, EstadoEntrega::EN_REVISION);
        $titular = $this->actuarComo(Rol::ETTE, null);
        $payload = ['anexo' => 'gestion', 'observable_id' => $informe->id, 'descripcion' => 'Falta el detalle de pendientes.'];

        $this->postJson('/api/observaciones', $payload)
            ->assertStatus(422)->assertJsonValidationErrors('motivo_suplencia');

        $this->postJson('/api/observaciones', [...$payload, 'motivo_suplencia' => 'Coordinador con descanso médico.'])
            ->assertCreated();

        $this->assertDatabaseHas('observaciones', [
            'observable_id' => $informe->id,
            'autor_id' => $titular->id,
            'en_calidad_de' => CalidadEtte::TITULAR_SUPLENTE->value,
            'motivo_suplencia' => 'Coordinador con descanso médico.',
        ]);
    }

    public function test_responsable_y_servidor_no_registran_observaciones(): void
    {
        $this->entregaEn($this->hija, EstadoEntrega::EN_REVISION);
        $payload = ['anexo' => 'gestion', 'dependencia_id' => $this->hija->id, 'descripcion' => 'No tiene permiso para observar.'];

        $this->actuarComo(Rol::SERVIDOR, $this->hija);
        $this->postJson('/api/observaciones', $payload)->assertForbidden();

        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->hija);
        $this->postJson('/api/observaciones', $payload)->assertForbidden();
    }

    public function test_el_coordinador_retira_su_observacion_antes_de_aceptar(): void
    {
        $this->entregaEn($this->hija, EstadoEntrega::EN_REVISION);
        $observacion = $this->observacionDe($this->hija);

        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->hija);
        $this->postJson("/api/observaciones/{$observacion->id}/retirar")->assertForbidden();

        $this->actuarComo(Rol::DELEGADO_ETTE, $this->hija);
        $this->postJson("/api/observaciones/{$observacion->id}/retirar")
            ->assertOk()->assertJsonPath('data.estado', EstadoObservacion::RETIRADA->value);
    }

    public function test_tras_aceptar_la_observacion_queda_como_constancia(): void
    {
        $this->entregaEn($this->hija, EstadoEntrega::VERIFICADA);
        $observacion = $this->observacionDe($this->hija);
        $this->actuarComo(Rol::DELEGADO_ETTE, $this->hija);

        $this->postJson("/api/observaciones/{$observacion->id}/retirar")->assertConflict();

        $this->assertSame(EstadoObservacion::REGISTRADA, $observacion->fresh()->estado);
    }

    public function test_listado_de_observaciones_se_acota_al_ambito(): void
    {
        $otraRama = Dependencia::factory()->create([
            'proceso_transferencia_id' => $this->proceso->id,
            'nivel' => 2,
        ]);
        $this->observacionDe($this->hija);
        $this->observacionDe($otraRama);

        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->hija);
        $respuesta = $this->getJson('/api/observaciones')->assertOk();

        $this->assertSame([$this->hija->id], array_column($respuesta->json('data'), 'dependencia_id'));
    }
}

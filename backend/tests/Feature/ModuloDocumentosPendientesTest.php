<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Documentos\Models\DocumentoPendiente;
use App\Modules\Gestion\Models\InformeGestion;
use App\Modules\Gestion\Services\InformeGestionPdf;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\Rol;
use Database\Seeders\RolesPermisosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Con `modulos.documentos_pendientes` apagado (valor por defecto) solo se
 * ocultan los indicadores fuera del Anexo 02: el perfil lo informa al frontend
 * y el drill-down responde 404. La pantalla de documentos pendientes y la
 * sección IV del Anexo 02 siguen activas.
 */
class ModuloDocumentosPendientesTest extends TestCase
{
    use RefreshDatabase;

    private ProcesoTransferencia $proceso;

    private Dependencia $dep;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesPermisosSeeder::class);
        $this->proceso = ProcesoTransferencia::factory()->create();
        $this->dep = Dependencia::factory()->create(['proceso_transferencia_id' => $this->proceso->id]);
        $usuario = User::factory()->create();
        AsignacionRol::factory()->rol(Rol::SERVIDOR)->create([
            'user_id' => $usuario->id,
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->dep->id,
        ]);
        Sanctum::actingAs($usuario);
    }

    public function test_viene_apagado_y_el_perfil_lo_informa(): void
    {
        $this->getJson('/api/auth/me')->assertOk()
            ->assertJsonPath('data.modulos.documentos_pendientes', false);
    }

    public function test_apagado_el_drilldown_responde_404_aunque_el_usuario_tenga_permiso(): void
    {
        $this->getJson('/api/documentos-pendientes/drilldown?dependencia_id='.$this->dep->id)->assertNotFound()
            ->assertJsonPath('message', 'Este módulo no está habilitado.');
    }

    public function test_apagado_la_pantalla_de_apoyo_del_anexo_02_sigue_activa(): void
    {
        $this->postJson('/api/documentos-pendientes', [
            'dependencia_id' => $this->dep->id,
            'asunto' => 'Nuevo',
            'justificacion_pendiente' => 'Falta el informe técnico',
        ])
            ->assertCreated();
        $this->getJson('/api/documentos-pendientes?dependencia_id='.$this->dep->id)->assertOk();
        $this->getJson('/api/documentos-pendientes/resumen?dependencia_id='.$this->dep->id)->assertOk();

        $this->assertDatabaseCount('documentos_pendientes', 1);
    }

    public function test_apagado_el_anexo_02_incluye_los_pendientes_en_vivo_y_los_ya_congelados(): void
    {
        DocumentoPendiente::create([
            'proceso_transferencia_id' => $this->proceso->id, 'dependencia_id' => $this->dep->id,
            'asunto' => 'Oficio del SGD', 'fuente' => 'sgd',
        ]);
        $informe = InformeGestion::create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->dep->id,
            'pendientes_items' => [['n' => 1, 'asunto' => 'Convenio por renovar']],
        ]);
        $this->assertSame(['Convenio por renovar', 'Oficio del SGD'], $this->asuntosSeccionIv());

        $informe->update([
            'pendientes_documentales' => [['asunto' => 'Oficio congelado', 'origen' => 'sgd']],
            'pendientes_congelados_en' => now(),
        ]);
        $this->assertSame(['Convenio por renovar', 'Oficio congelado'], $this->asuntosSeccionIv());
    }

    /** @return list<string> */
    private function asuntosSeccionIv(): array
    {
        return array_column(app(InformeGestionPdf::class)->datos($this->dep->id)['informe']['pendientes_items'], 'asunto');
    }
}

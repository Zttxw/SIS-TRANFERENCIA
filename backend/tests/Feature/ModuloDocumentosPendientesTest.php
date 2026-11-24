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
 * Con `modulos.documentos_pendientes` apagado (valor por defecto), el módulo
 * desaparece para todos: sus rutas responden 404, el perfil lo informa al
 * frontend y la sección IV del Anexo 02 solo conserva la entrada libre.
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

    public function test_apagado_sus_rutas_responden_404_aunque_el_usuario_tenga_permiso(): void
    {
        $this->getJson('/api/documentos-pendientes?dependencia_id='.$this->dep->id)->assertNotFound()
            ->assertJsonPath('message', 'Este módulo no está habilitado.');
        $this->postJson('/api/documentos-pendientes', ['dependencia_id' => $this->dep->id, 'asunto' => 'Nuevo'])
            ->assertNotFound();

        $this->assertDatabaseCount('documentos_pendientes', 0);
    }

    public function test_apagado_el_anexo_02_omite_los_pendientes_en_vivo_y_los_ya_congelados(): void
    {
        $base = [
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->dep->id,
            'pendientes_items' => [['n' => 1, 'asunto' => 'Convenio por renovar']],
        ];
        DocumentoPendiente::create([
            'proceso_transferencia_id' => $this->proceso->id, 'dependencia_id' => $this->dep->id,
            'asunto' => 'Oficio del SGD', 'fuente' => 'sgd',
        ]);

        $informe = InformeGestion::create($base);
        $this->assertSame(['Convenio por renovar'], $this->asuntosSeccionIv());

        $informe->update([
            'pendientes_documentales' => [['asunto' => 'Oficio congelado', 'origen' => 'sgd']],
            'pendientes_congelados_en' => now(),
        ]);
        $this->assertSame(['Convenio por renovar'], $this->asuntosSeccionIv());
    }

    /** @return list<string> */
    private function asuntosSeccionIv(): array
    {
        return array_column(app(InformeGestionPdf::class)->datos($this->dep->id)['informe']['pendientes_items'], 'asunto');
    }
}

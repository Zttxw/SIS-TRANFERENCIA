<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Gestion\Models\InformeGestion;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Patrimonio\Models\BienPatrimonial;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\Rol;
use Database\Seeders\RolesPermisosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Maatwebsite\Excel\Facades\Excel;
use Tests\TestCase;

/**
 * Módulo de Reportes (F5): consolidados en JSON acotados al ámbito y exportación
 * Excel/PDF gated por reportes.exportar.
 */
class ReportesTest extends TestCase
{
    use RefreshDatabase;

    private ProcesoTransferencia $proceso;

    private Dependencia $dep;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesPermisosSeeder::class);
        $this->proceso = ProcesoTransferencia::factory()->create();
        $this->dep = Dependencia::factory()->create([
            'proceso_transferencia_id' => $this->proceso->id,
            'nivel' => 2,
        ]);
    }

    private function actuar(Rol $rol): User
    {
        $usuario = User::factory()->create();
        AsignacionRol::factory()->rol($rol)->create([
            'user_id' => $usuario->id,
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->dep->id,
        ]);
        Sanctum::actingAs($usuario);

        return $usuario;
    }

    public function test_matriz_de_anexos_json(): void
    {
        $this->actuar(Rol::ETTS);
        InformeGestion::create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->dep->id,
            'funciones' => [['n' => 1, 'descripcion' => 'Función de prueba.']],
            'estado' => 'completado',
        ]);

        $r = $this->getJson('/api/reportes/matriz-anexos')->assertOk();
        $r->assertJsonPath('data.filas.0.dependencia_id', $this->dep->id);
        $r->assertJsonPath('data.filas.0.anexo_02', true);
        $r->assertJsonStructure(['data' => ['generado_en', 'metricas', 'filas']]);
    }

    public function test_conciliacion_patrimonial_solo_lista_dependencias_con_bienes(): void
    {
        $this->actuar(Rol::ETTS);
        BienPatrimonial::create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->dep->id,
            'codigo_patrimonial' => '740895000001',
            'denominacion' => 'Silla',
        ]);

        $r = $this->getJson('/api/reportes/conciliacion-patrimonial')->assertOk();
        $r->assertJsonPath('data.filas.0.total', 1);
    }

    public function test_reporte_inexistente_404(): void
    {
        $this->actuar(Rol::ETTS);
        $this->getJson('/api/reportes/inexistente')->assertStatus(404);
    }

    public function test_exportar_excel_requiere_permiso(): void
    {
        // El servidor no tiene reportes.exportar → 403.
        $this->actuar(Rol::SERVIDOR);
        $this->get('/api/reportes/matriz-anexos/export?formato=excel')->assertStatus(403);
    }

    public function test_exportar_excel_descarga(): void
    {
        $this->actuar(Rol::ETTS);
        Excel::fake();

        $this->get('/api/reportes/matriz-anexos/export?formato=excel')->assertOk();

        Excel::matchByRegex();
        Excel::assertDownloaded('/^reporte-matriz-anexos-.*\.xlsx$/');
    }

    public function test_exportar_pdf_descarga(): void
    {
        $this->actuar(Rol::ETTS);

        $r = $this->get('/api/reportes/matriz-anexos/export?formato=pdf');
        $r->assertOk();
        $r->assertHeader('content-type', 'application/pdf');
        $this->assertStringStartsWith('%PDF', $r->streamedContent());
    }
}

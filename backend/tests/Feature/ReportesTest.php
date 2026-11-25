<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Acervo\Models\AcervoDocumental;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Gestion\Models\InformeGestion;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Patrimonio\Models\BienPatrimonial;
use App\Modules\Transferencia\Models\FirmaBorrador;
use App\Modules\Transferencia\Models\Observacion;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\CalidadEtte;
use App\Support\Enums\EstadoObservacion;
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
        FirmaBorrador::create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->dep->id,
            'tipo_documento' => 'anexo02',
            'pdf_path' => 'firmaperu/borradores/test.pdf',
            'pdf_sha256' => str_repeat('a', 64),
            'generado_en' => now(),
        ]);

        $r = $this->getJson('/api/reportes/matriz-anexos')->assertOk();
        $r->assertJsonPath('data.filas.0.dependencia_id', $this->dep->id);
        $r->assertJsonPath('data.filas.0.anexo_02', 'generado');
        $r->assertJsonPath('data.filas.0.anexo_03a', 'no_generado');
        $r->assertJsonPath('data.filas.0.anexo_03b', 'no_generado');
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

    private function observacion(Dependencia $dependencia, EstadoObservacion $estado, ?AcervoDocumental $serie = null): Observacion
    {
        return Observacion::create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $dependencia->id,
            'anexo' => 'acervo_fisico',
            'observable_type' => $serie?->getMorphClass(),
            'observable_id' => $serie?->id,
            'autor_id' => User::factory()->create(['name' => 'Coordinadora ETTE'])->id,
            'en_calidad_de' => CalidadEtte::COORDINADOR,
            'descripcion' => "Observación {$estado->value}",
            'estado' => $estado,
        ]);
    }

    public function test_reporte_de_observaciones_resume_las_vigentes_y_retiradas_del_ambito(): void
    {
        $this->actuar(Rol::RESPONSABLE_CENTRO_COSTO);
        $serie = AcervoDocumental::create([
            'proceso_transferencia_id' => $this->proceso->id, 'dependencia_id' => $this->dep->id,
            'tipo' => 'fisico', 'serie_documental' => 'Oficios', 'anio' => 2025, 'folios' => 10,
        ]);
        $sobreFila = $this->observacion($this->dep, EstadoObservacion::REGISTRADA, $serie);
        $this->observacion($this->dep, EstadoObservacion::RETIRADA);
        $ajena = Dependencia::factory()->create(['proceso_transferencia_id' => $this->proceso->id]);
        $this->observacion($ajena, EstadoObservacion::REGISTRADA);

        $this->getJson('/api/reportes/observaciones')->assertOk()
            ->assertJsonPath('data.resumen', ['total' => 2, 'registradas' => 1, 'retiradas' => 1, 'centros_observados' => 1])
            ->assertJsonCount(2, 'data.filas')
            ->assertJsonPath('data.filas.0.id', $sobreFila->id)
            ->assertJsonPath('data.filas.0.anexo', 'Anexo 03-A — Acervo físico')
            ->assertJsonPath('data.filas.0.detalle', 'Registro N° '.$serie->id)
            ->assertJsonPath('data.filas.0.en_calidad_de', CalidadEtte::COORDINADOR->etiqueta())
            ->assertJsonPath('data.filas.1.detalle', 'Anexo completo')
            ->assertJsonPath('data.filas.1.estado', 'retirada');
    }

    public function test_la_matriz_cuenta_solo_las_observaciones_vigentes(): void
    {
        $this->actuar(Rol::ETTS);
        $this->observacion($this->dep, EstadoObservacion::REGISTRADA);
        $this->observacion($this->dep, EstadoObservacion::RETIRADA);

        $this->getJson('/api/reportes/matriz-anexos')->assertOk()
            ->assertJsonPath('data.filas.0.observaciones_vigentes', 1)
            ->assertJsonPath('data.metricas.observadas', 1);
    }

    public function test_exportar_observaciones_en_pdf(): void
    {
        $this->actuar(Rol::ETTS);
        $this->observacion($this->dep, EstadoObservacion::REGISTRADA);

        $r = $this->get('/api/reportes/observaciones/export?formato=pdf')->assertOk();
        $this->assertStringStartsWith('%PDF', $r->streamedContent());
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

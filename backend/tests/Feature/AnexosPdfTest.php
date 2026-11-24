<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Acervo\Models\AcervoDocumental;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\NoPatrimonial\Models\BienNoPatrimonial;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Organization\Models\Servidor;
use App\Modules\Patrimonio\Models\BienPatrimonial;
use App\Modules\Patrimonio\Models\VerificacionBien;
use App\Modules\Patrimonio\Services\PatrimonioPdf;
use App\Modules\Personal\Models\Personal;
use App\Modules\Transferencia\Models\Entrega;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\EstadoEntrega;
use App\Support\Enums\EstadoVerificacionBien;
use App\Support\Enums\Rol;
use Database\Seeders\RolesPermisosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * PDF oficiales de los anexos 03–06 y del acta 07 (F5). Verifica que cada
 * endpoint produce un PDF y que el acta se obtiene antes de remitir.
 */
class AnexosPdfTest extends TestCase
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

    private function assertEsPdf(TestResponse $r): void
    {
        $r->assertOk();
        $r->assertHeader('content-type', 'application/pdf');
        $this->assertStringStartsWith('%PDF', $r->streamedContent());
    }

    public function test_pdf_anexo_03_acervo(): void
    {
        $this->actuar(Rol::SERVIDOR);
        AcervoDocumental::create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->dep->id,
            'tipo' => 'fisico',
            'serie_documental' => 'OFICIOS',
            'anio' => 2024,
            'folios' => 3,
            'unidad_conservacion' => 'Cajas Archivadoras',
        ]);

        $this->assertEsPdf($this->get("/api/acervo/pdf?dependencia_id={$this->dep->id}"));
    }

    public function test_pdf_anexo_04_patrimonio_por_servidor(): void
    {
        $this->actuar(Rol::SERVIDOR);
        $servidor = Servidor::create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->dep->id,
            'dni' => '41414141',
            'nombres' => 'Carlos',
            'apellidos' => 'Quispe',
            'cargo' => 'Técnico',
        ]);
        BienPatrimonial::create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->dep->id,
            'servidor_id' => $servidor->id,
            'codigo_patrimonial' => '740895000001',
            'denominacion' => 'Escritorio de madera',
        ]);

        $this->assertEsPdf($this->get("/api/patrimonio/pdf?dependencia_id={$this->dep->id}"));
    }

    public function test_pdf_anexo_04_muestra_observaciones_solo_en_el_grupo_que_las_tiene(): void
    {
        $this->actuar(Rol::SERVIDOR);
        $conObservacion = $this->bienDeServidor('41414141', '740895000001');
        $sinObservacion = $this->bienDeServidor('42424242', '740895000002');
        VerificacionBien::create([
            'bien_patrimonial_id' => $conObservacion->id,
            'estado' => EstadoVerificacionBien::NO_UBICADO,
            'observacion' => 'No se encontró en la oficina',
        ]);
        VerificacionBien::create([
            'bien_patrimonial_id' => $sinObservacion->id,
            'estado' => EstadoVerificacionBien::CONFIRMADO,
        ]);

        $grupos = app(PatrimonioPdf::class)->datos($this->dep->id)['grupos'];

        $this->assertTrue($grupos[0]['tiene_observaciones']);
        $this->assertSame('No se encontró en la oficina', $grupos[0]['bienes'][0]['observacion']);
        $this->assertFalse($grupos[1]['tiene_observaciones']);
        $this->assertSame(
            ['codigo_patrimonial', 'denominacion', 'estado', 'marca', 'modelo', 'serie', 'observacion'],
            array_keys($grupos[1]['bienes'][0]),
        );
    }

    private function bienDeServidor(string $dni, string $codigoPatrimonial): BienPatrimonial
    {
        $servidor = Servidor::create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->dep->id,
            'dni' => $dni,
            'nombres' => 'Servidor',
            'apellidos' => $dni,
        ]);

        return BienPatrimonial::create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->dep->id,
            'servidor_id' => $servidor->id,
            'codigo_patrimonial' => $codigoPatrimonial,
            'denominacion' => 'Escritorio de madera',
        ]);
    }

    public function test_pdf_anexo_05_personal(): void
    {
        $this->actuar(Rol::SERVIDOR);
        Personal::create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->dep->id,
            'dni' => '40404040',
            'nombres' => 'Juana',
            'apellidos' => 'Pérez',
            'cargo' => 'Asistente administrativo',
            'regimen_laboral' => 'D.L. 728',
        ]);

        $this->assertEsPdf($this->get("/api/personal/pdf?dependencia_id={$this->dep->id}"));
    }

    public function test_pdf_anexo_06_nopatrimonial(): void
    {
        $this->actuar(Rol::SERVIDOR);
        BienNoPatrimonial::create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->dep->id,
            'denominacion' => 'Útiles de oficina',
            'cantidad' => 10,
            'unidad_medida' => 'Unidad',
            'estado_conservacion' => 'bueno',
        ]);

        $this->assertEsPdf($this->get("/api/nopatrimonial/pdf?dependencia_id={$this->dep->id}"));
    }

    public function test_pdf_acta_disponible_antes_de_remitir(): void
    {
        // El acta se emite antes de remitir: su PDF se obtiene en cualquier estado.
        $this->actuar(Rol::RESPONSABLE_CENTRO_COSTO);

        Entrega::create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->dep->id,
            'dependencia_destino_id' => $this->dep->parent_id,
            'estado' => EstadoEntrega::REMITIDA,
        ]);

        $this->assertEsPdf($this->get("/api/transferencia/acta/pdf?dependencia_id={$this->dep->id}"));
    }
}

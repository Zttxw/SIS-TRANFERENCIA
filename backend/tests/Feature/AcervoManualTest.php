<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Acervo\Models\AcervoDocumental;
use App\Modules\Acervo\Services\AcervoPdf;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\Rol;
use Database\Seeders\RolesPermisosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class AcervoManualTest extends TestCase
{
    use RefreshDatabase;

    private function datosFisicos(): array
    {
        $this->seed(RolesPermisosSeeder::class);
        $proceso = ProcesoTransferencia::factory()->create();
        $dep = Dependencia::factory()->create(['proceso_transferencia_id' => $proceso->id]);
        $usuario = User::factory()->create();
        AsignacionRol::factory()->rol(Rol::SERVIDOR)->create([
            'user_id' => $usuario->id, 'dependencia_id' => $dep->id,
            'proceso_transferencia_id' => $proceso->id,
        ]);
        Sanctum::actingAs($usuario);

        return [
            'dependencia_id' => $dep->id, 'tipo' => 'fisico',
            'serie_documental' => 'Informes técnicos', 'cantidad_unidades' => 1,
            'unidad_conservacion' => 'Archivadores de Palanca',
            'identificacion_archivador' => 'OTI-2026-TOMO-01', 'total_folios' => 250,
        ];
    }

    #[TestWith([null, 'sgd', 'Sistema de Gestión Documental (SGD)'])]
    #[TestWith(['', 'sgd', 'Sistema de Gestión Documental (SGD)'])]
    #[TestWith(['   ', 'sgd', 'Sistema de Gestión Documental (SGD)'])]
    #[TestWith(['Repositorio OTI', 'sgd', 'Repositorio OTI'])]
    #[TestWith([null, 'manual', null])]
    public function test_ubicacion_sgd_se_muestra_en_listado_y_pdf_solo_si_esta_vacia(
        ?string $ubicacion, string $fuente, ?string $esperada,
    ): void {
        $datos = $this->datosFisicos();
        $registro = AcervoDocumental::create([
            ...$datos,
            'proceso_transferencia_id' => ProcesoTransferencia::where('estado', 'abierto')->value('id'),
            'tipo' => 'digital', 'fuente' => $fuente, 'ubicacion' => $ubicacion,
        ]);

        $this->getJson('/api/acervo?dependencia_id='.$datos['dependencia_id'])->assertOk()
            ->assertJsonPath('data.0.id', $registro->id)
            ->assertJsonPath('data.0.ubicacion', $esperada);

        $pdf = app(AcervoPdf::class)->datos($datos['dependencia_id']);
        $this->assertSame($esperada, $pdf['grupos'][0]['series'][0]['ubicacion']);
    }

    public function test_detalle_fisico_se_guarda_y_se_busca_pero_pdf_respeta_columnas_del_formato(): void
    {
        $datos = $this->datosFisicos();

        $id = $this->postJson('/api/acervo', $datos)->assertCreated()
            ->assertJsonPath('data.total_folios', 250)->json('data.id');

        $this->assertDatabaseHas('acervo_documental', [
            'id' => $id, 'identificacion_archivador' => 'OTI-2026-TOMO-01',
            'total_folios' => 250, 'cantidad_unidades' => 1,
        ]);
        $this->getJson('/api/acervo?dependencia_id='.$datos['dependencia_id'].'&search=TOMO-01')
            ->assertOk()->assertJsonPath('data.0.id', $id);
        $pdf = app(AcervoPdf::class)->datos($datos['dependencia_id']);
        $html = view('pdf.partials.anexo03', $pdf)->render();
        $this->assertStringNotContainsString('Archivador: OTI-2026-TOMO-01', $html);
        $this->assertStringNotContainsString('250 folios', $html);
    }

    public function test_folios_se_pueden_corregir_y_se_limpian_al_cambiar_a_digital(): void
    {
        $datos = $this->datosFisicos();
        $id = $this->postJson('/api/acervo', $datos)->assertCreated()->json('data.id');

        $this->putJson('/api/acervo/'.$id, [...$datos, 'total_folios' => 300])->assertOk()
            ->assertJsonPath('data.total_folios', 300);
        $this->assertDatabaseHas('acervo_documental', ['id' => $id, 'total_folios' => 300]);

        unset($datos['total_folios'], $datos['identificacion_archivador']);
        $this->putJson('/api/acervo/'.$id, [...$datos, 'tipo' => 'digital'])->assertOk()
            ->assertJsonPath('data.total_folios', null)
            ->assertJsonPath('data.identificacion_archivador', null);
        $this->assertDatabaseHas('acervo_documental', ['id' => $id, 'tipo' => 'digital', 'total_folios' => null, 'identificacion_archivador' => null]);
    }

    #[TestWith([0])]
    #[TestWith([-1])]
    #[TestWith([2.5])]
    #[TestWith(['muchos'])]
    #[TestWith([2147483648])]
    public function test_folios_invalidos_devuelven_422_sin_guardar(int|float|string $folios): void
    {
        $datos = $this->datosFisicos();

        $this->postJson('/api/acervo', [...$datos, 'total_folios' => $folios])->assertUnprocessable()
            ->assertJsonValidationErrors('total_folios');

        $this->assertDatabaseCount('acervo_documental', 0);
    }

    public function test_digital_no_acepta_identificacion_fisica_ni_folios(): void
    {
        $datos = $this->datosFisicos();

        $this->postJson('/api/acervo', [...$datos, 'tipo' => 'digital'])->assertUnprocessable()
            ->assertJsonValidationErrors(['identificacion_archivador', 'total_folios']);

        $this->assertDatabaseCount('acervo_documental', 0);
    }

    #[TestWith([null, null, null, '2023 - 2024', 2023, 2024, '2023'])]
    #[TestWith([2026, null, null, '2026', 2026, 2026, '2026'])]
    #[TestWith([null, 2021, 2022, '2023 - 2024', 2021, 2022, '2021'])]
    public function test_pdf_recupera_rango_de_anios_y_agrupa_registros_anteriores(
        ?int $anio, ?int $desde, ?int $hasta, string $periodo,
        int $desdeEsperado, int $hastaEsperado, string $grupoEsperado,
    ): void {
        $datos = $this->datosFisicos();
        $this->postJson('/api/acervo', [
            ...$datos, 'anio' => $anio, 'desde_anio' => $desde,
            'hasta_anio' => $hasta, 'periodo' => $periodo,
        ])->assertCreated();

        $pdf = app(AcervoPdf::class)->datos($datos['dependencia_id']);

        $this->assertSame($grupoEsperado, $pdf['grupos'][0]['anio']);
        $this->assertSame($desdeEsperado, $pdf['grupos'][0]['series'][0]['desde_anio']);
        $this->assertSame($hastaEsperado, $pdf['grupos'][0]['series'][0]['hasta_anio']);
    }

    public function test_registro_de_archivador_historico_no_necesita_existir_en_sgd_y_se_busca_por_periodo(): void
    {
        $this->seed(RolesPermisosSeeder::class);
        $proceso = ProcesoTransferencia::factory()->create();
        $dep = Dependencia::factory()->create(['proceso_transferencia_id' => $proceso->id]);
        $usuario = User::factory()->create();
        AsignacionRol::factory()->rol(Rol::SERVIDOR)->create(['user_id' => $usuario->id,
            'dependencia_id' => $dep->id, 'proceso_transferencia_id' => $proceso->id]);
        Sanctum::actingAs($usuario);
        $datos = ['dependencia_id' => $dep->id, 'tipo' => 'fisico', 'serie_documental' => 'Informes técnicos',
            'periodo' => '2020 - 2024', 'cantidad_unidades' => 6, 'unidad_conservacion' => 'Archivadores',
            'ubicacion' => 'Estante 2', 'fuente' => 'sgd'];
        $id = $this->postJson('/api/acervo', $datos)->assertCreated()->assertJsonPath('data.fuente', 'manual')->json('data.id');
        $this->assertDatabaseHas('acervo_documental', ['id' => $id, 'proceso_transferencia_id' => $proceso->id,
            'fuente' => 'manual', 'periodo' => '2020 - 2024', 'tipo' => 'fisico', 'cantidad_unidades' => 6]);
        $anterior = ProcesoTransferencia::factory()->cerrado()->create();
        AcervoDocumental::create(['proceso_transferencia_id' => $anterior->id,
            ...$datos, 'serie_documental' => 'Proceso anterior', 'fuente' => 'manual']);
        $this->getJson('/api/acervo?dependencia_id='.$dep->id.'&search=2024')->assertOk()
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $id);
        $this->getJson('/api/acervo?dependencia_id='.$dep->id)->assertOk()->assertJsonCount(1, 'data');
    }
}

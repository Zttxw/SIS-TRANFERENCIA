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
            'user_id' => $usuario->id, 'dependencia_id' => $this->dep->id,
            'proceso_transferencia_id' => $this->proceso->id,
        ]);
        Sanctum::actingAs($usuario);
    }

    /** @return array<string, mixed> */
    private function serieFisica(): array
    {
        return [
            'dependencia_id' => $this->dep->id,
            'serie_documental' => 'Oficios emitidos',
            'anio' => 2024,
            'folios' => 250,
            'unidad_conservacion' => 'Archivadores de Palanca',
            'ubicacion' => 'Estante 3, nivel 2',
        ];
    }

    /** @param  array<string, mixed>  $atributos */
    private function serieSgd(array $atributos = []): AcervoDocumental
    {
        return AcervoDocumental::create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->dep->id,
            'tipo' => AcervoDocumental::TIPO_DIGITAL,
            'serie_documental' => 'Informe recibidos',
            'anio' => 2026,
            'folios' => 40,
            'unidad_conservacion' => AcervoDocumental::UNIDAD_ARCHIVO_DIGITAL,
            'fuente' => 'sgd',
            'fuente_referencia' => 'TDTV_DESTINOS CO_DEP_DES=00025 CO_TIP_DOC_ADM=011 NU_ANN=2026',
            ...$atributos,
        ]);
    }

    public function test_la_serie_registrada_a_mano_siempre_va_a_la_seccion_fisica(): void
    {
        $id = $this->postJson('/api/acervo', [...$this->serieFisica(), 'tipo' => 'digital', 'fuente' => 'sgd'])
            ->assertCreated()
            ->assertJsonPath('data.folios', 250)
            ->json('data.id');

        $this->assertDatabaseHas('acervo_documental', [
            'id' => $id, 'proceso_transferencia_id' => $this->proceso->id, 'tipo' => 'fisico',
            'fuente' => 'manual', 'serie_documental' => 'Oficios emitidos', 'anio' => 2024,
            'folios' => 250, 'unidad_conservacion' => 'Archivadores de Palanca', 'ubicacion' => 'Estante 3, nivel 2',
        ]);
    }

    public function test_las_cinco_columnas_del_formato_son_obligatorias(): void
    {
        $this->postJson('/api/acervo', ['dependencia_id' => $this->dep->id])->assertUnprocessable()
            ->assertJsonValidationErrors(['serie_documental', 'anio', 'folios', 'unidad_conservacion', 'ubicacion']);

        $this->assertDatabaseCount('acervo_documental', 0);
    }

    #[TestWith([0])]
    #[TestWith([-1])]
    #[TestWith([2.5])]
    #[TestWith(['muchos'])]
    #[TestWith([2147483648])]
    public function test_folios_invalidos_devuelven_422_sin_guardar(int|float|string $folios): void
    {
        $this->postJson('/api/acervo', [...$this->serieFisica(), 'folios' => $folios])->assertUnprocessable()
            ->assertJsonValidationErrors('folios');

        $this->assertDatabaseCount('acervo_documental', 0);
    }

    public function test_la_serie_fisica_se_corrige_sin_cambiar_de_centro_de_costo(): void
    {
        $id = $this->postJson('/api/acervo', $this->serieFisica())->assertCreated()->json('data.id');

        $this->putJson('/api/acervo/'.$id, [...$this->serieFisica(), 'folios' => 300, 'anio' => 2025])->assertOk()
            ->assertJsonPath('data.folios', 300)
            ->assertJsonPath('data.anio', 2025);

        $this->assertDatabaseHas('acervo_documental', ['id' => $id, 'dependencia_id' => $this->dep->id, 'folios' => 300, 'anio' => 2025]);
    }

    public function test_las_series_del_sgd_no_se_editan_ni_eliminan(): void
    {
        $serie = $this->serieSgd();

        $this->putJson('/api/acervo/'.$serie->id, [...$this->serieFisica(), 'folios' => 1])->assertUnprocessable()
            ->assertJsonPath('message', 'Las series del SGD se actualizan desde el SGD y no pueden modificarse.');
        $this->deleteJson('/api/acervo/'.$serie->id)->assertUnprocessable();

        $this->assertDatabaseHas('acervo_documental', ['id' => $serie->id, 'folios' => 40, 'deleted_at' => null]);
    }

    public function test_pdf_separa_la_seccion_digital_de_la_fisica_y_agrupa_por_anio_descendente(): void
    {
        $this->serieSgd();
        $this->serieSgd(['serie_documental' => 'Informe emitidos', 'anio' => 2025]);
        $this->postJson('/api/acervo', $this->serieFisica())->assertCreated();

        $pdf = app(AcervoPdf::class)->datos($this->dep->id);

        [$digital, $fisica] = $pdf['secciones'];
        $this->assertSame(['A', 'B'], [$digital['letra'], $fisica['letra']]);
        $this->assertSame(['2026', '2025'], array_column($digital['grupos'], 'anio'));
        $this->assertSame([
            'serie_documental' => 'Informe recibidos', 'folios' => 40,
            'unidad_conservacion' => 'Archivo Digital', 'ubicacion' => 'Sistema de Gestión Documental (SGD)',
        ], $digital['grupos'][0]['series'][0]);
        $this->assertSame(['2024'], array_column($fisica['grupos'], 'anio'));
        $this->assertSame('Oficios emitidos', $fisica['grupos'][0]['series'][0]['serie_documental']);
    }

    public function test_la_busqueda_encuentra_por_anio_y_ubicacion_solo_en_el_proceso_activo(): void
    {
        $id = $this->postJson('/api/acervo', $this->serieFisica())->assertCreated()->json('data.id');
        $anterior = ProcesoTransferencia::factory()->cerrado()->create();
        AcervoDocumental::create([...$this->serieFisica(), 'proceso_transferencia_id' => $anterior->id, 'tipo' => 'fisico']);

        foreach (['2024', 'Estante 3'] as $termino) {
            $this->getJson('/api/acervo?dependencia_id='.$this->dep->id.'&search='.urlencode($termino))->assertOk()
                ->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $id);
        }
    }
}

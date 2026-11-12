<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Acervo\Models\AcervoDocumental;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Organization\Services\CentrosCostoPdf;
use App\Modules\Transferencia\Models\ActaTransferencia;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Modules\Transferencia\Services\FirmaperuPdfService;
use App\Support\Enums\DeclaracionActa;
use App\Support\Services\PdfService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use InvalidArgumentException;
use Mockery\MockInterface;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class FirmaperuPdfTest extends TestCase
{
    use RefreshDatabase;

    #[DataProvider('anexosDisponibles')]
    public function test_genera_pdf_con_plantillas_actuales_sin_exigir_consolidacion(string $tipo): void
    {
        $proceso = ProcesoTransferencia::factory()->create();
        $dependencia = Dependencia::factory()->create(['proceso_transferencia_id' => $proceso->id]);
        $usuario = User::factory()->make();

        $pdf = app(FirmaperuPdfService::class)->generar($tipo, $dependencia->id, $usuario);

        $this->assertStringStartsWith('%PDF-', $pdf);
    }

    public static function anexosDisponibles(): array
    {
        return ['centros de costo' => ['anexo01'], 'informe' => ['anexo02'], 'acervo' => ['anexo03'], 'patrimonio' => ['anexo04'],
            'personal' => ['anexo05'], 'no patrimonial' => ['anexo06']];
    }

    public function test_pdf_de_acervo_excluye_registros_de_otro_proceso_y_dependencia(): void
    {
        $proceso = ProcesoTransferencia::factory()->create();
        $otroProceso = ProcesoTransferencia::factory()->create(['estado' => 'cerrado']);
        $dependencia = Dependencia::factory()->create(['proceso_transferencia_id' => $proceso->id]);
        $otraDependencia = Dependencia::factory()->create(['proceso_transferencia_id' => $proceso->id]);
        foreach ([
            [$proceso->id, $dependencia->id, 'SERIE CORRECTA'],
            [$otroProceso->id, $dependencia->id, 'OTRO PROCESO'],
            [$proceso->id, $otraDependencia->id, 'OTRA OFICINA'],
        ] as [$procesoId, $dependenciaId, $serie]) {
            AcervoDocumental::create([
                'proceso_transferencia_id' => $procesoId,
                'dependencia_id' => $dependenciaId,
                'tipo' => 'fisico',
                'serie_documental' => $serie,
                'anio' => 2026,
                'cantidad_unidades' => 1,
            ]);
        }
        $this->mock(PdfService::class, function (MockInterface $mock): void {
            $mock->shouldReceive('binario')->once()->withArgs(function (string $vista, array $datos): bool {
                $series = collect($datos['grupos'])->flatMap(fn (array $grupo): array => $grupo['series']);
                $this->assertSame(['SERIE CORRECTA'], $series->pluck('serie_documental')->all());
                $this->assertTrue($datos['contexto']['es_borrador']);

                return true;
            })->andReturn('%PDF-prueba');
        });

        $pdf = app(FirmaperuPdfService::class)->generar('anexo03', $dependencia->id, User::factory()->make());

        $this->assertSame('%PDF-prueba', $pdf);
    }

    public function test_acta_para_firma_se_emite_antes_de_remitir_como_suscripcion_de_la_dependencia(): void
    {
        $proceso = ProcesoTransferencia::factory()->create();
        $dependencia = Dependencia::factory()->create(['proceso_transferencia_id' => $proceso->id]);

        $pdf = app(FirmaperuPdfService::class)->generar('anexo07', $dependencia->id, User::factory()->make());

        $this->assertStringStartsWith('%PDF-', $pdf);
        $acta = ActaTransferencia::where('dependencia_id', $dependencia->id)->firstOrFail();
        $this->assertSame(DeclaracionActa::SUSCRIPCION_HIJA, $acta->declara);
        $this->assertSame(1, $acta->version);
    }

    public function test_rechaza_anexo_sin_generador(): void
    {
        $this->expectException(InvalidArgumentException::class);

        app(FirmaperuPdfService::class)->generar('desconocido', 1, User::factory()->make());
    }

    public function test_catalogo_del_anexo01_incluye_solo_centros_del_proceso_activo(): void
    {
        $proceso = ProcesoTransferencia::factory()->create();
        $anterior = ProcesoTransferencia::factory()->cerrado()->create();
        $dep = Dependencia::factory()->create(['proceso_transferencia_id' => $proceso->id, 'codigo' => '01']);
        $otra = Dependencia::factory()->create(['proceso_transferencia_id' => $proceso->id, 'codigo' => '02']);
        Dependencia::factory()->create(['proceso_transferencia_id' => $anterior->id]);

        $datos = app(CentrosCostoPdf::class)->datos($dep->id);

        $this->assertSame([$dep->id, $otra->id], $datos['centros']->pluck('id')->all());
    }
}

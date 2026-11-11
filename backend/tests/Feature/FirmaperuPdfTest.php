<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Acervo\Models\AcervoDocumental;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Modules\Transferencia\Services\FirmaperuPdfService;
use App\Support\Services\PdfService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Exceptions\HttpResponseException;
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
        return ['informe' => ['anexo02'], 'acervo' => ['anexo03'], 'patrimonio' => ['anexo04'],
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

    public function test_acta_conserva_restriccion_existente_de_entrega_consolidada(): void
    {
        $proceso = ProcesoTransferencia::factory()->create();
        $dependencia = Dependencia::factory()->create(['proceso_transferencia_id' => $proceso->id]);

        try {
            app(FirmaperuPdfService::class)->generar('anexo07', $dependencia->id, User::factory()->make());
            $this->fail('El acta no debe generarse sin consolidación.');
        } catch (HttpResponseException $exception) {
            $this->assertSame(409, $exception->getResponse()->getStatusCode());
        }
    }

    public function test_rechaza_anexo_sin_generador(): void
    {
        $this->expectException(InvalidArgumentException::class);

        app(FirmaperuPdfService::class)->generar('anexo01', 1, User::factory()->make());
    }
}

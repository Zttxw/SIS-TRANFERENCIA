<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Modules\Acervo\Models\AcervoDocumental;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Organization\Models\TipoDocumentalSgd;
use App\Modules\Organization\Services\IngestaDocumentalSgd;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class IngestaAcervoDigitalSgdTest extends TestCase
{
    use RefreshDatabase;

    private const CONEXION_SGD = 'sgd_prueba';

    protected function setUp(): void
    {
        parent::setUp();

        config(['database.connections.'.self::CONEXION_SGD => ['driver' => 'sqlite', 'database' => ':memory:', 'prefix' => '']]);

        Schema::connection(self::CONEXION_SGD)->create('TDTV_REMITOS', function (Blueprint $tabla) {
            $tabla->string('NU_ANN');
            $tabla->string('NU_EMI');
            $tabla->string('CO_DEP_EMI')->nullable();
            $tabla->string('CO_TIP_DOC_ADM')->nullable();
            $tabla->string('ES_ELI')->default('0');
            $tabla->string('ES_DOC_EMI')->default('1');
            $tabla->string('NU_DOC_EMI')->nullable();
            $tabla->string('DE_ASU')->nullable();
            $tabla->string('FE_EMI')->nullable();
        });

        Schema::connection(self::CONEXION_SGD)->create('TDTV_DESTINOS', function (Blueprint $tabla) {
            $tabla->string('NU_ANN');
            $tabla->string('NU_EMI');
            $tabla->string('NU_DES');
            $tabla->string('CO_DEP_DES')->nullable();
            $tabla->string('CO_EMP_DES')->nullable();
            $tabla->string('ES_ELI')->default('0');
            $tabla->string('ES_DOC_REC')->nullable();
            $tabla->string('CO_PRI')->nullable();
            $tabla->string('FE_DES')->nullable();
        });
    }

    public function test_las_hojas_de_envio_y_los_proveidos_no_forman_series_del_acervo_digital(): void
    {
        $proceso = ProcesoTransferencia::factory()->create(['anio' => 2026]);
        $oficina = Dependencia::factory()->origenSgd()->create(['proceso_transferencia_id' => $proceso->id]);
        foreach (['003' => 'INFORME', '232' => 'PROVEIDO', '304' => 'HOJA DE ENVIO'] as $codigo => $descripcion) {
            TipoDocumentalSgd::create(['codigo' => $codigo, 'descripcion' => $descripcion, 'activo' => true]);
        }

        $numero = 0;
        foreach (['003', '232', '304'] as $tipo) {
            $emitido = (string) ++$numero;
            $this->remito($emitido, $oficina->codigo, $tipo);

            $recibido = (string) ++$numero;
            $this->remito($recibido, '09999', $tipo);
            DB::connection(self::CONEXION_SGD)->table('TDTV_DESTINOS')->insert([
                'NU_ANN' => '2026', 'NU_EMI' => $recibido, 'NU_DES' => '1',
                'CO_DEP_DES' => $oficina->codigo, 'ES_DOC_REC' => '2',
            ]);
        }

        (new IngestaDocumentalSgd(esquema: 'main', conexionSgd: self::CONEXION_SGD))->ejecutar($proceso);

        $series = AcervoDocumental::query()
            ->where('dependencia_id', $oficina->id)
            ->orderBy('serie_documental')
            ->pluck('numero_documentos', 'serie_documental')
            ->all();

        $this->assertSame(['Informe emitidos' => 1, 'Informe recibidos' => 1], $series);
    }

    private function remito(string $numero, string $dependenciaEmisora, string $tipo): void
    {
        DB::connection(self::CONEXION_SGD)->table('TDTV_REMITOS')->insert([
            'NU_ANN' => '2026',
            'NU_EMI' => $numero,
            'CO_DEP_EMI' => $dependenciaEmisora,
            'CO_TIP_DOC_ADM' => $tipo,
        ]);
    }
}

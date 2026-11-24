<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Modules\Acervo\Services\AcervoReferenciaSgd;
use PHPUnit\Framework\Attributes\TestWith;
use PHPUnit\Framework\TestCase;

class AcervoReferenciaSgdTest extends TestCase
{
    #[TestWith([AcervoReferenciaSgd::EMITIDOS, 'TDTV_REMITOS CO_DEP_EMI=00025,00092 CO_TIP_DOC_ADM=011 NU_ANN=2026'])]
    #[TestWith([AcervoReferenciaSgd::RECIBIDOS, 'TDTV_DESTINOS CO_DEP_DES=00025,00092 CO_TIP_DOC_ADM=011 NU_ANN=2026'])]
    public function test_la_referencia_conserva_el_sentido_de_la_serie(string $sentido, string $esperada): void
    {
        $referencia = AcervoReferenciaSgd::construir($sentido, ['00092', '00025', '00092'], '011', '2026');

        $this->assertSame($esperada, $referencia);
        $this->assertSame(
            ['sentido' => $sentido, 'deps' => ['00025', '00092'], 'tipo' => '011', 'anio' => '2026'],
            AcervoReferenciaSgd::leer($referencia),
        );
    }

    public function test_fusionar_series_recibidas_une_dependencias_sin_volverlas_emitidas(): void
    {
        $fusionada = AcervoReferenciaSgd::fusionar(
            'TDTV_DESTINOS CO_DEP_DES=00098 CO_TIP_DOC_ADM=011 NU_ANN=2026',
            'TDTV_DESTINOS CO_DEP_DES=00021 CO_TIP_DOC_ADM=011 NU_ANN=2026',
        );

        $this->assertSame('TDTV_DESTINOS CO_DEP_DES=00021,00098 CO_TIP_DOC_ADM=011 NU_ANN=2026', $fusionada);
    }

    public function test_una_referencia_ajena_al_sgd_no_se_interpreta(): void
    {
        $this->assertNull(AcervoReferenciaSgd::leer('Registro manual'));
    }
}

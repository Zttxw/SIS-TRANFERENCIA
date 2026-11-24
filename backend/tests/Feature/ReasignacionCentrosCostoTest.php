<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Acervo\Models\AcervoDocumental;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Organization\Models\EquivalenciaCentroCosto;
use App\Modules\Organization\Services\ReasignacionCentrosCosto;
use App\Modules\Patrimonio\Models\BienPatrimonial;
use App\Modules\Transferencia\Models\Entrega;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\Rol;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Tests\TestCase;

/**
 * Traslado de los registros de las dependencias del SGD a su centro de costo
 * del Anexo 01 (D-11, comando centros-costo:reasignar).
 */
class ReasignacionCentrosCostoTest extends TestCase
{
    use RefreshDatabase;

    private ProcesoTransferencia $proceso;

    private Dependencia $abastecimientoCc;

    private Dependencia $abastecimientoSgd;

    private Dependencia $adquisicionesSgd;

    private Dependencia $metaSinAsignar;

    protected function setUp(): void
    {
        parent::setUp();
        $this->proceso = ProcesoTransferencia::factory()->create();
        $this->abastecimientoCc = Dependencia::factory()->create(['proceso_transferencia_id' => $this->proceso->id, 'codigo' => '11.04']);
        $this->abastecimientoSgd = $this->dependenciaSgd('00021', $this->abastecimientoCc);
        $this->adquisicionesSgd = $this->dependenciaSgd('00098', $this->abastecimientoCc);
        $this->metaSinAsignar = $this->dependenciaSgd('00071', null);
    }

    public function test_los_bienes_pasan_al_cc_y_lo_sin_asignar_se_informa(): void
    {
        $bien = $this->bien('B-1', $this->adquisicionesSgd);
        $this->bien('B-2', $this->metaSinAsignar);

        $resultado = app(ReasignacionCentrosCosto::class)->ejecutar($this->proceso->id);

        $this->assertSame($this->abastecimientoCc->id, $bien->fresh()->dependencia_id);
        $this->assertSame(['00071'], array_column($resultado['sin_asignar'], 'codigo'));
    }

    public function test_el_acervo_de_dos_dependencias_del_mismo_cc_se_suma_en_una_fila(): void
    {
        $this->acervo($this->abastecimientoSgd, 10, 'TDTV_REMITOS CO_DEP_EMI=00021 CO_TIP_DOC_ADM=011 NU_ANN=2026');
        $this->acervo($this->adquisicionesSgd, 5, 'TDTV_REMITOS CO_DEP_EMI=00098 CO_TIP_DOC_ADM=011 NU_ANN=2026');

        $resultado = app(ReasignacionCentrosCosto::class)->ejecutar($this->proceso->id);

        $filas = AcervoDocumental::where('dependencia_id', $this->abastecimientoCc->id)->get();
        $this->assertCount(1, $filas);
        $this->assertSame(15, $filas->first()->numero_documentos);
        $this->assertSame('TDTV_REMITOS CO_DEP_EMI=00021,00098 CO_TIP_DOC_ADM=011 NU_ANN=2026', $filas->first()->fuente_referencia);
        $this->assertSame(1, $resultado['acervo_fusionado']);
    }

    public function test_una_asignacion_repetida_en_el_mismo_cc_queda_una_sola_vez(): void
    {
        $usuario = User::factory()->create();
        foreach ([$this->abastecimientoSgd, $this->adquisicionesSgd] as $dependencia) {
            AsignacionRol::factory()->rol(Rol::SERVIDOR)->create([
                'user_id' => $usuario->id,
                'proceso_transferencia_id' => $this->proceso->id,
                'dependencia_id' => $dependencia->id,
            ]);
        }

        app(ReasignacionCentrosCosto::class)->ejecutar($this->proceso->id);

        $this->assertSame(
            [$this->abastecimientoCc->id],
            AsignacionRol::where('user_id', $usuario->id)->pluck('dependencia_id')->all(),
        );
    }

    public function test_la_simulacion_informa_sin_guardar_cambios(): void
    {
        $bien = $this->bien('B-1', $this->abastecimientoSgd);

        $resultado = app(ReasignacionCentrosCosto::class)->ejecutar($this->proceso->id, simular: true);

        $this->assertSame(1, $resultado['movidos']['bienes_patrimoniales']);
        $this->assertSame($this->abastecimientoSgd->id, $bien->fresh()->dependencia_id);
    }

    public function test_se_detiene_si_una_dependencia_del_sgd_ya_tiene_entrega(): void
    {
        $bien = $this->bien('B-1', $this->abastecimientoSgd);
        Entrega::create(['proceso_transferencia_id' => $this->proceso->id, 'dependencia_id' => $this->abastecimientoSgd->id]);

        try {
            app(ReasignacionCentrosCosto::class)->ejecutar($this->proceso->id);
            $this->fail('La reasignación debía detenerse.');
        } catch (RuntimeException $e) {
            $this->assertStringContainsString('entregas', $e->getMessage());
        }

        $this->assertSame($this->abastecimientoSgd->id, $bien->fresh()->dependencia_id);
    }

    public function test_el_comando_en_simulacion_no_guarda_cambios(): void
    {
        $bien = $this->bien('B-1', $this->abastecimientoSgd);

        $this->artisan('centros-costo:reasignar', ['--proceso' => (string) $this->proceso->id, '--simular' => true])
            ->assertSuccessful();

        $this->assertSame($this->abastecimientoSgd->id, $bien->fresh()->dependencia_id);
    }

    private function dependenciaSgd(string $codigo, ?Dependencia $centro): Dependencia
    {
        $dependencia = Dependencia::factory()->origenSgd()->create([
            'proceso_transferencia_id' => $this->proceso->id,
            'codigo' => $codigo,
        ]);
        EquivalenciaCentroCosto::create([
            'proceso_transferencia_id' => $this->proceso->id,
            'origen' => EquivalenciaCentroCosto::ORIGEN_SGD,
            'codigo_origen' => $codigo,
            'dependencia_origen_id' => $dependencia->id,
            'centro_costo_id' => $centro?->id,
        ]);

        return $dependencia;
    }

    private function bien(string $codigo, Dependencia $dependencia): BienPatrimonial
    {
        return BienPatrimonial::create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $dependencia->id,
            'codigo_patrimonial' => $codigo,
            'denominacion' => 'Equipo',
        ]);
    }

    private function acervo(Dependencia $dependencia, int $cantidad, string $referencia): void
    {
        AcervoDocumental::create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $dependencia->id,
            'tipo' => AcervoDocumental::TIPO_DIGITAL,
            'serie_documental' => 'Oficio',
            'anio' => 2026,
            'numero_documentos' => $cantidad,
            'fuente' => 'sgd',
            'fuente_referencia' => $referencia,
        ]);
    }
}

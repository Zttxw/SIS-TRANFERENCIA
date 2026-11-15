<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Integrations\Contracts\SigaConnectorInterface;
use App\Integrations\DTOs\SigaBienDTO;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Organization\Models\Servidor;
use App\Modules\Patrimonio\Models\BienPatrimonial;
use App\Modules\Patrimonio\Services\IngestaPatrimonioSiga;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\FuenteDato;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use RuntimeException;
use Tests\TestCase;

class IngestaPatrimonioAdscripcionTest extends TestCase
{
    use RefreshDatabase;

    public function test_bienes_de_dos_oficinas_no_cambian_la_adscripcion_sgd_del_servidor(): void
    {
        $proceso = ProcesoTransferencia::factory()->create();
        $oficinaA = Dependencia::factory()->create([
            'proceso_transferencia_id' => $proceso->id,
            'codigo' => '00025',
            'codigo_siga' => '01.03.07.04',
        ]);
        $oficinaB = Dependencia::factory()->create([
            'proceso_transferencia_id' => $proceso->id,
            'codigo' => '00026',
            'codigo_siga' => '01.03.07.05',
        ]);
        $servidor = Servidor::create([
            'proceso_transferencia_id' => $proceso->id,
            'dependencia_id' => $oficinaA->id,
            'dni' => '12345678',
            'nombres' => 'Nombre SGD',
            'apellidos' => 'Apellido SGD',
            'fuente' => FuenteDato::SGD,
        ]);

        $conector = new class implements SigaConnectorInterface
        {
            public function obtenerCentrosCosto(): Collection
            {
                return collect([
                    ['codigo' => '01.03.07.04', 'nombre' => 'Oficina A', 'sede' => null],
                    ['codigo' => '01.03.07.05', 'nombre' => 'Oficina B', 'sede' => null],
                ]);
            }

            public function obtenerBienesPorCentroCosto(string $codigoCentroCosto): Collection
            {
                return collect([new SigaBienDTO(
                    codigoPatrimonial: $codigoCentroCosto === '01.03.07.04' ? 'BIEN-A' : 'BIEN-B',
                    descripcion: 'Equipo',
                    marca: null,
                    modelo: null,
                    serie: null,
                    color: null,
                    estadoConservacion: null,
                    valorAdquisicion: null,
                    codigoCentroCosto: $codigoCentroCosto,
                    nombreCentroCosto: null,
                    dniResponsable: '12345678',
                    nombreResponsable: 'Nombre SIGA',
                    ubicacionFisica: null,
                    estadoActual: null,
                )]);
            }

            public function obtenerBienesPorResponsable(string $dniResponsable): Collection
            {
                return collect();
            }
        };

        (new IngestaPatrimonioSiga($conector))->ejecutar($proceso);

        $this->assertSame($oficinaA->id, $servidor->fresh()->dependencia_id);
        $this->assertSame('Nombre SGD', $servidor->fresh()->nombres);
        $this->assertSame(FuenteDato::SGD, $servidor->fresh()->fuente);
        $this->assertSame($oficinaA->id, BienPatrimonial::where('codigo_patrimonial', 'BIEN-A')->value('dependencia_id'));
        $this->assertSame($oficinaB->id, BienPatrimonial::where('codigo_patrimonial', 'BIEN-B')->value('dependencia_id'));
    }

    public function test_un_bien_sin_mapeo_de_centro_de_costo_detiene_la_ingesta(): void
    {
        $proceso = ProcesoTransferencia::factory()->create();
        $conector = new class implements SigaConnectorInterface
        {
            public function obtenerCentrosCosto(): Collection
            {
                return collect([['codigo' => '99.01', 'nombre' => 'Sin mapeo', 'sede' => null]]);
            }

            public function obtenerBienesPorCentroCosto(string $codigoCentroCosto): Collection
            {
                return collect([new SigaBienDTO(
                    codigoPatrimonial: 'SIN-MAPEO',
                    descripcion: 'Equipo',
                    marca: null,
                    modelo: null,
                    serie: null,
                    color: null,
                    estadoConservacion: null,
                    valorAdquisicion: null,
                    codigoCentroCosto: $codigoCentroCosto,
                    nombreCentroCosto: null,
                    dniResponsable: null,
                    nombreResponsable: null,
                    ubicacionFisica: null,
                    estadoActual: null,
                )]);
            }

            public function obtenerBienesPorResponsable(string $dniResponsable): Collection
            {
                return collect();
            }
        };

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('SIN-MAPEO');
        (new IngestaPatrimonioSiga($conector))->ejecutar($proceso);
    }
}

<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Integrations\Contracts\SigaConnectorInterface;
use App\Integrations\DTOs\SigaBienDTO;
use App\Models\User;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Organization\Models\EquivalenciaCentroCosto;
use App\Modules\Organization\Models\Servidor;
use App\Modules\Organization\Services\CatalogoCentrosCosto;
use App\Modules\Organization\Services\EquivalenciasCentroCosto;
use App\Modules\Patrimonio\Models\BienPatrimonial;
use App\Modules\Patrimonio\Services\IngestaPatrimonioSiga;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\FuenteDato;
use App\Support\Enums\Rol;
use Database\Seeders\RolesPermisosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Tabla de equivalencias SGD/SIGA → CC del Anexo 01 (D-11), definida a mano
 * por nombre en database/data/equivalencias_centro_costo.csv.
 */
class EquivalenciasCentroCostoTest extends TestCase
{
    use RefreshDatabase;

    private ProcesoTransferencia $proceso;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesPermisosSeeder::class);
        $this->proceso = ProcesoTransferencia::factory()->create();
        app(CatalogoCentrosCosto::class)->instalar($this->proceso);
    }

    public function test_la_propuesta_vincula_por_nombre_y_deja_sin_asignar_lo_demas(): void
    {
        $patrimonial = $this->dependenciaSgd('00023', 'OFICINA DE GESTIÓN PATRIMONIAL');
        $meta = $this->dependenciaSgd('00135', 'PROGRAMA DE INCENTIVOS');
        $nueva = $this->dependenciaSgd('99999', 'UNIDAD CREADA DESPUÉS DEL CSV');

        app(EquivalenciasCentroCosto::class)->cargarPropuesta($this->proceso);

        $this->assertSame($this->centro('11.05')->id, $this->equivalenciaSgd($patrimonial)->centro_costo_id);
        $this->assertTrue($this->equivalenciaSgd($patrimonial)->es_principal);
        $this->assertNull($this->equivalenciaSgd($meta)->centro_costo_id);
        $this->assertNull($this->equivalenciaSgd($nueva)->centro_costo_id);
    }

    public function test_el_encargado_del_cc_es_el_de_su_dependencia_principal_del_sgd(): void
    {
        $patrimonial = $this->dependenciaSgd('00023', 'OFICINA DE GESTIÓN PATRIMONIAL');
        $jefe = Servidor::create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $patrimonial->id,
            'dni' => '40000001',
            'nombres' => 'Jefa',
            'apellidos' => 'Patrimonial',
            'fuente' => FuenteDato::SGD,
        ]);
        $patrimonial->update(['encargado_servidor_id' => $jefe->id]);

        app(EquivalenciasCentroCosto::class)->cargarPropuesta($this->proceso);

        $this->assertSame($jefe->id, $this->centro('11.05')->encargado_servidor_id);
    }

    public function test_recargar_la_propuesta_conserva_lo_confirmado_a_mano(): void
    {
        $meta = $this->dependenciaSgd('00135', 'PROGRAMA DE INCENTIVOS');
        $servicio = app(EquivalenciasCentroCosto::class);
        $servicio->cargarPropuesta($this->proceso);
        $servicio->asignar($this->equivalenciaSgd($meta), $this->centro('13.02')->id, false, User::factory()->create());

        $servicio->cargarPropuesta($this->proceso);

        $this->assertSame($this->centro('13.02')->id, $this->equivalenciaSgd($meta)->centro_costo_id);
    }

    public function test_el_administrador_asigna_una_dependencia_y_cambia_la_principal(): void
    {
        $patrimonial = $this->dependenciaSgd('00023', 'OFICINA DE GESTIÓN PATRIMONIAL');
        $meta = $this->dependenciaSgd('00135', 'PROGRAMA DE INCENTIVOS');
        app(EquivalenciasCentroCosto::class)->cargarPropuesta($this->proceso);
        $admin = $this->usuarioConRol(Rol::ADMINISTRADOR);
        Sanctum::actingAs($admin);

        $this->putJson('/api/centros-costo/equivalencias/'.$this->equivalenciaSgd($meta)->id, [
            'centro_costo_id' => $this->centro('11.05')->id,
            'es_principal' => true,
        ])->assertOk()->assertJsonPath('data.centro_costo.codigo', '11.05');

        $this->assertSame($admin->id, $this->equivalenciaSgd($meta)->confirmada_por_id);
        $this->assertFalse($this->equivalenciaSgd($patrimonial)->es_principal);
    }

    public function test_solo_se_asigna_a_un_cc_del_anexo_01(): void
    {
        $meta = $this->dependenciaSgd('00135', 'PROGRAMA DE INCENTIVOS');
        $otraSgd = $this->dependenciaSgd('00035', 'SUBGERENCIA DE MANTENIMIENTO');
        app(EquivalenciasCentroCosto::class)->cargarPropuesta($this->proceso);
        Sanctum::actingAs($this->usuarioConRol(Rol::ADMINISTRADOR));

        $this->putJson('/api/centros-costo/equivalencias/'.$this->equivalenciaSgd($meta)->id, [
            'centro_costo_id' => $otraSgd->id,
        ])->assertUnprocessable()->assertJsonValidationErrors('centro_costo_id');
    }

    public function test_sin_permiso_de_parametros_no_se_editan_equivalencias(): void
    {
        $meta = $this->dependenciaSgd('00135', 'PROGRAMA DE INCENTIVOS');
        app(EquivalenciasCentroCosto::class)->cargarPropuesta($this->proceso);
        Sanctum::actingAs($this->usuarioConRol(Rol::ETTS));

        $this->getJson('/api/centros-costo/equivalencias')->assertForbidden();
        $this->putJson('/api/centros-costo/equivalencias/'.$this->equivalenciaSgd($meta)->id, [
            'centro_costo_id' => $this->centro('13.02')->id,
        ])->assertForbidden();
    }

    public function test_el_listado_filtra_las_unidades_sin_asignar(): void
    {
        $this->dependenciaSgd('00023', 'OFICINA DE GESTIÓN PATRIMONIAL');
        $this->dependenciaSgd('00135', 'PROGRAMA DE INCENTIVOS');
        app(EquivalenciasCentroCosto::class)->cargarPropuesta($this->proceso);
        Sanctum::actingAs($this->usuarioConRol(Rol::ADMINISTRADOR));

        $respuesta = $this->getJson('/api/centros-costo/equivalencias?origen=sgd&sin_asignar=1')->assertOk();

        $this->assertSame(['PROGRAMA DE INCENTIVOS'], array_column($respuesta->json('data'), 'nombre_origen'));
    }

    public function test_los_bienes_de_control_patrimonial_y_gestion_patrimonial_del_siga_van_al_cc_11_05(): void
    {
        app(EquivalenciasCentroCosto::class)->cargarPropuesta($this->proceso);
        $conector = $this->conectorSiga([
            '01.03.06.06' => 'UNIDAD DE CONTROL PATRIMONIAL',
            '01.03.05.04' => 'OFICINA DE GESTIÓN PATRIMONIAL',
        ]);

        (new IngestaPatrimonioSiga($conector))->ejecutar($this->proceso);

        $this->assertSame(
            [$this->centro('11.05')->id],
            BienPatrimonial::whereIn('codigo_patrimonial', ['BIEN-01.03.06.06', 'BIEN-01.03.05.04'])->distinct()->pluck('dependencia_id')->all(),
        );
    }

    public function test_un_centro_de_costo_nuevo_del_siga_queda_registrado_sin_asignar(): void
    {
        app(EquivalenciasCentroCosto::class)->cargarPropuesta($this->proceso);

        try {
            (new IngestaPatrimonioSiga($this->conectorSiga(['01.09.99' => 'UNIDAD NUEVA DEL SIGA'])))->ejecutar($this->proceso);
            $this->fail('La ingesta debía detenerse por el bien sin equivalencia.');
        } catch (\RuntimeException $e) {
            $this->assertStringContainsString('01.09.99', $e->getMessage());
        }

        $this->assertDatabaseHas('equivalencias_centro_costo', [
            'origen' => 'siga',
            'codigo_origen' => '01.09.99',
            'nombre_origen' => 'UNIDAD NUEVA DEL SIGA',
            'centro_costo_id' => null,
        ]);
    }

    private function dependenciaSgd(string $codigo, string $nombre): Dependencia
    {
        return Dependencia::factory()->origenSgd()->create([
            'proceso_transferencia_id' => $this->proceso->id,
            'codigo' => $codigo,
            'nombre' => $nombre,
        ]);
    }

    private function centro(string $codigo): Dependencia
    {
        return Dependencia::query()->centrosCosto()
            ->where('proceso_transferencia_id', $this->proceso->id)
            ->where('codigo_ceplan', $codigo)
            ->firstOrFail();
    }

    private function equivalenciaSgd(Dependencia $dependencia): EquivalenciaCentroCosto
    {
        return EquivalenciaCentroCosto::where('dependencia_origen_id', $dependencia->id)->firstOrFail();
    }

    private function usuarioConRol(Rol $rol): User
    {
        $usuario = User::factory()->create();
        AsignacionRol::factory()->rol($rol)->create([
            'user_id' => $usuario->id,
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => null,
        ]);

        return $usuario;
    }

    /** @param  array<string, string>  $centros  código SIGA → nombre; un bien por centro */
    private function conectorSiga(array $centros): SigaConnectorInterface
    {
        return new class($centros) implements SigaConnectorInterface
        {
            /** @param  array<string, string>  $centros */
            public function __construct(private array $centros) {}

            public function obtenerCentrosCosto(): Collection
            {
                return collect($this->centros)->map(fn (string $nombre, string $codigo) => ['codigo' => $codigo, 'nombre' => $nombre, 'sede' => null])->values();
            }

            public function obtenerBienesPorCentroCosto(string $codigoCentroCosto): Collection
            {
                return collect([new SigaBienDTO(
                    codigoPatrimonial: "BIEN-{$codigoCentroCosto}",
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
    }
}

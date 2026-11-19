<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Auth\Services\ImportacionDelegadosService;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Organization\Models\Servidor;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\Rol;
use Database\Seeders\RolesPermisosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Tests\TestCase;

/**
 * D-10 — Alta de coordinadores ETTE por plantilla Excel: previsualización fila
 * por fila y aplicación de solo las filas válidas.
 */
class ImportacionDelegadosTest extends TestCase
{
    use RefreshDatabase;

    private ProcesoTransferencia $proceso;

    /** @var array<string, Dependencia> */
    private array $centros = [];

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesPermisosSeeder::class);
        $this->proceso = ProcesoTransferencia::factory()->create(['estado' => 'abierto']);
        foreach (['01', '02', '03', '03.01', '06', '06.01', '07', '07.05', '11', '11.05'] as $codigo) {
            $this->centros[$codigo] = Dependencia::factory()->create([
                'proceso_transferencia_id' => $this->proceso->id,
                'codigo' => $codigo,
            ]);
        }
    }

    private function comite(): User
    {
        $usuario = User::factory()->create();
        AsignacionRol::factory()->rol(Rol::ETTE)->create([
            'user_id' => $usuario->id,
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => null,
        ]);
        Sanctum::actingAs($usuario);

        return $usuario;
    }

    /**
     * Plantilla .xlsx con las celdas escritas como texto (como la descargada),
     * salvo los valores que el test pase como número.
     *
     * @param  list<list<string|int|float|null>>  $filas
     */
    private function plantilla(array $filas): UploadedFile
    {
        $libro = new Spreadsheet;
        $hoja = $libro->getActiveSheet();
        foreach ([ImportacionDelegadosService::COLUMNAS, ...$filas] as $i => $fila) {
            foreach (array_values($fila) as $j => $valor) {
                if ($valor === null) {
                    continue;
                }
                $celda = [$j + 1, $i + 1];
                is_string($valor)
                    ? $hoja->setCellValueExplicit($celda, $valor, DataType::TYPE_STRING)
                    : $hoja->setCellValue($celda, $valor);
            }
        }
        $ruta = tempnam(sys_get_temp_dir(), 'coordinadores').'.xlsx';
        (new Xlsx($libro))->save($ruta);

        return new UploadedFile($ruta, 'coordinadores.xlsx', null, null, true);
    }

    /** @return list<list<string>> */
    private function diezFilasValidasYDosErroneas(): array
    {
        $filas = [];
        foreach (array_keys($this->centros) as $i => $codigo) {
            $filas[] = [sprintf('4100%04d', $i), 'Apellido'.$i, 'Nombre'.$i, '', '', $codigo, ''];
        }
        $filas[] = ['123', 'Corto', 'Dni', '', '', '07', ''];
        $filas[] = ['42000000', 'Sin', 'Centro', '', '', '99.99', ''];

        return $filas;
    }

    public function test_la_previsualizacion_informa_cada_fila_sin_aplicar_nada(): void
    {
        $this->comite();

        $respuesta = $this->post('/api/delegados/importar', [
            'archivo' => $this->plantilla($this->diezFilasValidasYDosErroneas()),
            'modo' => 'previsualizar',
        ])->assertOk()
            ->assertJsonPath('data.resumen.crear_usuario', 10)
            ->assertJsonPath('data.resumen.error', 2)
            ->assertJsonPath('data.resultados.10.fila', 12)
            ->assertJsonPath('data.resultados.10.motivo', 'DNI inválido: debe tener 8 dígitos.')
            ->assertJsonPath('data.resultados.11.motivo', 'El código CC 99.99 no existe en el Anexo 01.');

        $this->assertCount(12, $respuesta->json('data.resultados'));
        $this->assertSame(0, AsignacionRol::where('rol', Rol::DELEGADO_ETTE->value)->count());
        $this->assertDatabaseMissing('users', ['dni' => '41000000']);
    }

    public function test_confirmar_aplica_solo_las_filas_validas(): void
    {
        $comite = $this->comite();

        $respuesta = $this->post('/api/delegados/importar', [
            'archivo' => $this->plantilla($this->diezFilasValidasYDosErroneas()),
            'modo' => 'confirmar',
        ])->assertOk()
            ->assertJsonPath('data.resumen.crear_usuario', 10)
            ->assertJsonPath('data.resumen.error', 2)
            ->assertJsonCount(10, 'data.credenciales');

        $this->assertSame(10, AsignacionRol::where('rol', Rol::DELEGADO_ETTE->value)
            ->where('acreditada_por_id', $comite->id)->count());
        $this->assertDatabaseMissing('users', ['dni' => '42000000']);

        $credencial = $respuesta->json('data.credenciales.0');
        $cuenta = User::where('dni', $credencial['dni'])->firstOrFail();
        $this->assertSame('Nombre0 Apellido0', $cuenta->name);
        $this->assertTrue(Hash::check($credencial['password'], $cuenta->password));
        $this->assertTrue($cuenta->tieneRol(Rol::DELEGADO_ETTE, $this->centros['01']->id));
    }

    public function test_una_cuenta_existente_se_asigna_sin_crear_otra_y_se_avisa_del_coordinador_previo(): void
    {
        $this->comite();
        $existente = User::factory()->create(['dni' => '43000000', 'name' => 'Cuenta Existente']);
        $previo = User::factory()->create(['name' => 'Coordinador Previo']);
        AsignacionRol::factory()->rol(Rol::DELEGADO_ETTE)->create([
            'user_id' => $previo->id,
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->centros['07.05']->id,
        ]);

        $this->post('/api/delegados/importar', [
            'archivo' => $this->plantilla([['43000000', '', '', '', '', '07.05', 'Acreditado por oficio 12']]),
            'modo' => 'confirmar',
        ])->assertOk()
            ->assertJsonPath('data.resultados.0.accion', ImportacionDelegadosService::ACCION_ASIGNAR)
            ->assertJsonPath('data.resultados.0.avisos.0', 'El CC ya tiene coordinador: Coordinador Previo.')
            ->assertJsonCount(0, 'data.credenciales');

        $this->assertSame(1, User::where('dni', '43000000')->count());
        $this->assertDatabaseHas('asignaciones_rol', [
            'user_id' => $existente->id,
            'dependencia_id' => $this->centros['07.05']->id,
            'rol' => Rol::DELEGADO_ETTE->value,
            'observacion' => 'Acreditado por oficio 12',
        ]);
    }

    public function test_reconoce_asignaciones_existentes_filas_repetidas_y_dnis_del_padron(): void
    {
        $this->comite();
        $asignado = User::factory()->create(['dni' => '44000000']);
        AsignacionRol::factory()->rol(Rol::DELEGADO_ETTE)->create([
            'user_id' => $asignado->id,
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->centros['06']->id,
        ]);
        Servidor::create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->centros['11']->id,
            'dni' => '45000000',
            'nombres' => 'Servidora',
            'apellidos' => 'Del Padrón',
        ]);

        $this->post('/api/delegados/importar', [
            'archivo' => $this->plantilla([
                ['44000000', '', '', '', '', '06', ''],
                ['46000000', 'Pérez', 'Ana', '', '', '06.01', ''],
                ['46000000', 'Pérez', 'Ana', '', '', '06.01', ''],
                ['45000000', 'Del Padrón', 'Servidora', '', '', '11', ''],
            ]),
        ])->assertOk()
            ->assertJsonPath('data.resultados.0.accion', ImportacionDelegadosService::ACCION_YA_ASIGNADO)
            ->assertJsonPath('data.resultados.1.accion', ImportacionDelegadosService::ACCION_CREAR_USUARIO)
            ->assertJsonPath('data.resultados.2.motivo', 'Fila repetida: el mismo DNI y CC ya figuran en la fila 3.')
            ->assertJsonPath('data.resultados.3.motivo', 'El DNI está en el padrón del SGD y aún no tiene cuenta: active primero su cuenta desde el padrón.');
    }

    public function test_un_dni_leido_como_numero_recupera_el_cero_inicial_y_el_codigo_numerico_se_rechaza(): void
    {
        $this->comite();

        $this->post('/api/delegados/importar', [
            'archivo' => $this->plantilla([
                [1234567, 'Quispe', 'Luis', '', '', '03.01', ''],
                ['47000000', 'Mamani', 'Rosa', '', '', 7.05, ''],
            ]),
        ])->assertOk()
            ->assertJsonPath('data.resultados.0.dni', '01234567')
            ->assertJsonPath('data.resultados.0.accion', ImportacionDelegadosService::ACCION_CREAR_USUARIO)
            ->assertJsonPath('data.resultados.1.motivo', 'Escriba el código CC como texto (por ejemplo, 07.05).');
    }

    public function test_un_archivo_sin_las_columnas_de_la_plantilla_se_rechaza(): void
    {
        $this->comite();
        $libro = new Spreadsheet;
        $libro->getActiveSheet()->fromArray([['Nombre', 'Oficina'], ['Ana', 'Logística']]);
        $ruta = tempnam(sys_get_temp_dir(), 'otro').'.xlsx';
        (new Xlsx($libro))->save($ruta);

        $this->post('/api/delegados/importar', ['archivo' => new UploadedFile($ruta, 'otro.xlsx', null, null, true)], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['archivo' => 'El archivo no tiene las columnas de la plantilla (al menos "DNI" y "Código CC (Anexo 01)").']);
    }

    public function test_la_plantilla_se_descarga_con_la_hoja_de_centros_de_costo(): void
    {
        $this->comite();

        $respuesta = $this->get('/api/delegados/plantilla')->assertOk();

        $libro = IOFactory::load($respuesta->getFile()->getPathname());
        $this->assertSame(ImportacionDelegadosService::COLUMNAS, $libro->getSheet(0)->rangeToArray('A1:G1')[0]);
        $this->assertSame(['Código CC', 'Centro de costo', 'Nivel', 'CC padre'], $libro->getSheet(1)->rangeToArray('A1:D1')[0]);
        $this->assertSame(count($this->centros) + 1, $libro->getSheet(1)->getHighestDataRow());
    }

    public function test_un_coordinador_no_puede_importar(): void
    {
        $coordinador = User::factory()->create();
        AsignacionRol::factory()->rol(Rol::DELEGADO_ETTE)->create([
            'user_id' => $coordinador->id,
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->centros['07']->id,
        ]);
        Sanctum::actingAs($coordinador);

        $this->post('/api/delegados/importar', ['archivo' => $this->plantilla([])], ['Accept' => 'application/json'])
            ->assertForbidden();
    }
}

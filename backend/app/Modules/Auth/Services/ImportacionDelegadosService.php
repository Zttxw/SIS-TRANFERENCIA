<?php

declare(strict_types=1);

namespace App\Modules\Auth\Services;

use App\Models\User;
use App\Modules\Auth\Excel\DelegadosImport;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Organization\Models\Servidor;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\Rol;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Maatwebsite\Excel\Facades\Excel;

/**
 * Alta de coordinadores ETTE por plantilla Excel (D-10). Primero se previsualiza
 * el resultado fila por fila; al confirmar se aplican, en una sola transacción,
 * solo las filas válidas.
 *
 * - Un DNI con cuenta usa esa cuenta; uno sin cuenta crea un usuario externo con
 *   contraseña temporal (se devuelve una sola vez, al confirmar).
 * - Un DNI del padrón del SGD sin cuenta no se crea aquí: su cuenta se activa
 *   desde el padrón, para que reciba sus roles de servidor.
 *
 * @phpstan-type FilaPlantilla array{fila: int, dni: string, apellidos: string, nombres: string, correo: string, celular: string, codigo_cc: string, observacion: string, codigo_cc_numerico: bool}
 * @phpstan-type ResultadoFila array{fila: int, dni: string, nombre: string, codigo_cc: string, centro_costo: ?string, accion: string, motivo: ?string, avisos: list<string>}
 */
class ImportacionDelegadosService
{
    public const COLUMNAS = ['DNI', 'Apellidos', 'Nombres', 'Correo', 'Celular', 'Código CC (Anexo 01)', 'Observación'];

    public const ACCION_CREAR_USUARIO = 'crear_usuario';

    public const ACCION_ASIGNAR = 'asignar';

    public const ACCION_YA_ASIGNADO = 'ya_asignado';

    public const ACCION_ERROR = 'error';

    private const MAX_FILAS = 500;

    /** Encabezado normalizado → clave interna. */
    private const ENCABEZADOS = [
        'dni' => 'dni',
        'apellidos' => 'apellidos',
        'nombres' => 'nombres',
        'correo' => 'correo',
        'celular' => 'celular',
        'codigoccanexo01' => 'codigo_cc',
        'codigocc' => 'codigo_cc',
        'observacion' => 'observacion',
    ];

    public function __construct(private readonly DelegadoService $delegados) {}

    /**
     * Lee la primera hoja de la plantilla.
     *
     * @return list<FilaPlantilla>
     */
    public function leer(UploadedFile $archivo): array
    {
        $hojas = Excel::toArray(new DelegadosImport, $archivo);

        return $this->interpretar($hojas[0] ?? []);
    }

    /**
     * Convierte las filas crudas (la primera es el encabezado) en filas con clave.
     *
     * @param  array<int, array<int, mixed>>  $crudas
     * @return list<FilaPlantilla>
     */
    public function interpretar(array $crudas): array
    {
        $crudas = array_values($crudas);
        $encabezado = array_shift($crudas) ?? [];

        $columnas = [];
        foreach ($encabezado as $indice => $titulo) {
            $clave = self::ENCABEZADOS[$this->normalizarEncabezado((string) $titulo)] ?? null;
            if ($clave !== null && ! in_array($clave, $columnas, true)) {
                $columnas[$indice] = $clave;
            }
        }

        if (! in_array('dni', $columnas, true) || ! in_array('codigo_cc', $columnas, true)) {
            throw ValidationException::withMessages([
                'archivo' => 'El archivo no tiene las columnas de la plantilla (al menos "DNI" y "Código CC (Anexo 01)").',
            ]);
        }

        $filas = [];
        foreach ($crudas as $posicion => $celdas) {
            $fila = ['fila' => $posicion + 2, 'dni' => '', 'apellidos' => '', 'nombres' => '', 'correo' => '',
                'celular' => '', 'codigo_cc' => '', 'observacion' => '', 'codigo_cc_numerico' => false];
            foreach ($columnas as $indice => $clave) {
                $valor = $celdas[$indice] ?? null;
                if ($clave === 'codigo_cc' && is_float($valor)) {
                    $fila['codigo_cc_numerico'] = true;
                }
                $fila[$clave] = $clave === 'dni' ? $this->normalizarDni($valor) : trim((string) $valor);
            }

            if (implode('', array_intersect_key($fila, array_flip(array_values($columnas)))) === '') {
                continue;
            }
            $filas[] = $fila;
        }

        if ($filas === []) {
            throw ValidationException::withMessages(['archivo' => 'La plantilla no tiene filas con datos.']);
        }
        if (count($filas) > self::MAX_FILAS) {
            throw ValidationException::withMessages(['archivo' => 'La plantilla admite como máximo '.self::MAX_FILAS.' filas.']);
        }

        return $filas;
    }

    /**
     * Resultado fila por fila, sin cambiar nada.
     *
     * @param  list<FilaPlantilla>  $filas
     * @return list<ResultadoFila>
     */
    public function analizar(array $filas, ?int $procesoId = null): array
    {
        $procesoId = $procesoId ?? $this->resolverProcesoActivoId();

        $centros = Dependencia::query()->centrosCosto()
            ->where('proceso_transferencia_id', $procesoId)
            ->get(['id', 'codigo', 'nombre', 'activa'])
            ->keyBy('codigo');
        $cuentas = User::query()->whereIn('dni', array_column($filas, 'dni'))->get()->keyBy('dni');
        $enPadron = Servidor::query()->where('proceso_transferencia_id', $procesoId)
            ->whereIn('dni', array_column($filas, 'dni'))->pluck('dni')->flip();
        $vigentes = AsignacionRol::query()->with('usuario:id,dni,name')
            ->where('proceso_transferencia_id', $procesoId)
            ->where('rol', Rol::DELEGADO_ETTE->value)
            ->get()
            ->groupBy('dependencia_id');

        $vistas = [];
        $dnisNuevos = [];
        $porCentro = [];
        $resultados = [];

        foreach ($filas as $fila) {
            $codigo = $this->normalizarCodigo($fila['codigo_cc']);
            $centro = $centros->get($codigo);
            $resultado = [
                'fila' => $fila['fila'],
                'dni' => $fila['dni'],
                'nombre' => $this->nombreCompleto($fila) ?: (string) $cuentas->get($fila['dni'])?->name,
                'codigo_cc' => $codigo,
                'centro_costo' => $centro?->nombre,
                'accion' => self::ACCION_ERROR,
                'motivo' => null,
                'avisos' => [],
            ];

            $error = $this->errorDeFila($fila, $codigo, $centro, $vistas);
            if ($error === null) {
                $cuenta = $cuentas->get($fila['dni']);
                if ($cuenta !== null) {
                    $resultado['nombre'] = $cuenta->name;
                    $error = $cuenta->activo ? null : 'La cuenta de este DNI está desactivada.';
                    $yaAsignado = ($vigentes->get($centro->id) ?? collect())->contains('user_id', $cuenta->id);
                    $resultado['accion'] = $yaAsignado ? self::ACCION_YA_ASIGNADO : self::ACCION_ASIGNAR;
                } elseif (isset($dnisNuevos[$fila['dni']])) {
                    $resultado['accion'] = self::ACCION_ASIGNAR;
                    $resultado['nombre'] = $dnisNuevos[$fila['dni']];
                } elseif ($enPadron->has($fila['dni'])) {
                    $error = 'El DNI está en el padrón del SGD y aún no tiene cuenta: active primero su cuenta desde el padrón.';
                } elseif ($fila['apellidos'] === '' || $fila['nombres'] === '') {
                    $error = 'Para crear la cuenta indique apellidos y nombres.';
                } elseif ($fila['correo'] !== '' && User::query()->where('email', $fila['correo'])->exists()) {
                    $error = 'El correo ya pertenece a otra cuenta.';
                } else {
                    $resultado['accion'] = self::ACCION_CREAR_USUARIO;
                    $dnisNuevos[$fila['dni']] = $resultado['nombre'];
                }
            }

            if ($error !== null) {
                $resultado['accion'] = self::ACCION_ERROR;
                $resultado['motivo'] = $error;
            } else {
                $vistas[$fila['dni'].'|'.$codigo] = $fila['fila'];
                $otros = ($vigentes->get($centro->id) ?? collect())
                    ->filter(fn (AsignacionRol $a): bool => $a->usuario?->dni !== $fila['dni'])
                    ->map(fn (AsignacionRol $a): string => (string) $a->usuario?->name);
                if ($otros->isNotEmpty() && $resultado['accion'] !== self::ACCION_YA_ASIGNADO) {
                    $resultado['avisos'][] = 'El CC ya tiene coordinador: '.$otros->implode(', ').'.';
                }
                if (isset($porCentro[$codigo])) {
                    $resultado['avisos'][] = "El archivo asigna otro coordinador al mismo CC (fila {$porCentro[$codigo]}).";
                }
                $porCentro[$codigo] ??= $fila['fila'];
            }

            $resultados[] = $resultado;
        }

        return $resultados;
    }

    /**
     * Aplica las filas válidas en una sola transacción.
     *
     * @param  list<FilaPlantilla>  $filas
     * @return array{resultados: list<ResultadoFila>, resumen: array<string, int>, credenciales: list<array{dni: string, nombre: string, password: string}>}
     */
    public function confirmar(array $filas, User $usuario, ?int $procesoId = null): array
    {
        $procesoId = $procesoId ?? $this->resolverProcesoActivoId();

        return DB::transaction(function () use ($filas, $usuario, $procesoId): array {
            $resultados = $this->analizar($filas, $procesoId);
            $porFila = collect($filas)->keyBy('fila');
            $credenciales = [];

            foreach ($resultados as $resultado) {
                if (! in_array($resultado['accion'], [self::ACCION_CREAR_USUARIO, self::ACCION_ASIGNAR], true)) {
                    continue;
                }
                $fila = $porFila->get($resultado['fila']);

                if ($resultado['accion'] === self::ACCION_CREAR_USUARIO) {
                    $password = Str::password(12, symbols: false);
                    User::create([
                        'dni' => $fila['dni'],
                        'name' => $resultado['nombre'],
                        'email' => $fila['correo'] !== '' ? $fila['correo'] : null,
                        'celular' => $fila['celular'] !== '' ? $fila['celular'] : null,
                        'password' => Hash::make($password),
                        'activo' => true,
                        'servidor_id' => null,
                    ]);
                    $credenciales[] = ['dni' => $fila['dni'], 'nombre' => $resultado['nombre'], 'password' => $password];
                }

                $cuenta = User::query()->where('dni', $fila['dni'])->firstOrFail();
                $centroId = (int) Dependencia::query()->centrosCosto()->where('proceso_transferencia_id', $procesoId)
                    ->where('codigo', $resultado['codigo_cc'])->value('id');
                $this->delegados->designar($cuenta->id, $centroId, $usuario, $fila['observacion'], $procesoId);
            }

            return [
                'resultados' => $resultados,
                'resumen' => $this->resumen($resultados),
                'credenciales' => $credenciales,
            ];
        });
    }

    /**
     * @param  list<ResultadoFila>  $resultados
     * @return array<string, int>
     */
    public function resumen(array $resultados): array
    {
        $resumen = array_fill_keys([self::ACCION_CREAR_USUARIO, self::ACCION_ASIGNAR, self::ACCION_YA_ASIGNADO, self::ACCION_ERROR], 0);
        foreach ($resultados as $resultado) {
            $resumen[$resultado['accion']]++;
        }

        return $resumen;
    }

    /**
     * @param  FilaPlantilla  $fila
     * @param  array<string, int>  $vistas
     */
    private function errorDeFila(array $fila, string $codigo, ?Dependencia $centro, array $vistas): ?string
    {
        if (! preg_match('/^[0-9]{8}$/', $fila['dni'])) {
            return 'DNI inválido: debe tener 8 dígitos.';
        }
        if ($fila['codigo_cc_numerico']) {
            return 'Escriba el código CC como texto (por ejemplo, 07.05).';
        }
        if ($codigo === '') {
            return 'Falta el código CC.';
        }
        if ($centro === null) {
            return "El código CC {$codigo} no existe en el Anexo 01.";
        }
        if (! $centro->activa) {
            return "El CC {$codigo} no está activo.";
        }
        if (isset($vistas[$fila['dni'].'|'.$codigo])) {
            return 'Fila repetida: el mismo DNI y CC ya figuran en la fila '.$vistas[$fila['dni'].'|'.$codigo].'.';
        }
        if ($fila['correo'] !== '' && filter_var($fila['correo'], FILTER_VALIDATE_EMAIL) === false) {
            return 'El correo no es válido.';
        }
        if ($fila['celular'] !== '' && ! preg_match('/^\+?[0-9 ]{6,20}$/', $fila['celular'])) {
            return 'El celular no es válido.';
        }

        return null;
    }

    /** @param FilaPlantilla $fila */
    private function nombreCompleto(array $fila): string
    {
        return trim(Str::squish($fila['nombres'].' '.$fila['apellidos']));
    }

    /**
     * El DNI leído como número pierde el cero inicial; se restituye hasta 8 dígitos.
     */
    private function normalizarDni(mixed $valor): string
    {
        if (is_int($valor) || (is_float($valor) && floor($valor) === $valor)) {
            return str_pad((string) (int) $valor, 8, '0', STR_PAD_LEFT);
        }

        return preg_replace('/\s+/', '', trim((string) $valor)) ?? '';
    }

    /**
     * "7.5" o "7.05" → "07.05": cada segmento del código CEPLAN tiene dos dígitos.
     */
    private function normalizarCodigo(string $codigo): string
    {
        $codigo = trim($codigo);
        if (! preg_match('/^[0-9]+(\.[0-9]+)*$/', $codigo)) {
            return $codigo;
        }

        return implode('.', array_map(fn (string $s): string => str_pad($s, 2, '0', STR_PAD_LEFT), explode('.', $codigo)));
    }

    private function normalizarEncabezado(string $titulo): string
    {
        return preg_replace('/[^a-z0-9]/', '', Str::lower(Str::ascii($titulo))) ?? '';
    }

    private function resolverProcesoActivoId(): int
    {
        return (int) (ProcesoTransferencia::where('estado', 'abierto')->value('id') ?? 1);
    }
}

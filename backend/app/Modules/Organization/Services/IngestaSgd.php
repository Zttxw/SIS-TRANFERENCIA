<?php

declare(strict_types=1);

namespace App\Modules\Organization\Services;

use App\Modules\Organization\Models\Dependencia;
use App\Modules\Organization\Models\Servidor;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\FuenteDato;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Ingesta de SOLO LECTURA del SGD hacia las tablas de dominio (plan §4.1, §6
 * Etapa 1, RN-01, RN-03, RN-06). Pobla `dependencias` y `servidores` del proceso
 * indicado, conservando la jerarquía y el encargado que declara el SGD.
 *
 * No muta el SGD. Es idempotente: re-ejecutar concilia por código (dependencias)
 * y por DNI/código (servidores) mediante updateOrInsert.
 *
 * Las consultas reproducen las del proyecto de referencia (REPORTE_SGD):
 * RHTM_DEPENDENCIA para la estructura y RHTM_PER_EMPLEADOS para el padrón.
 */
class IngestaSgd
{
    public function __construct(
        private readonly string $esquema,
        private readonly string $conexionSgd = 'sgd',
    ) {}

    public static function desdeConfig(): self
    {
        return new self(
            esquema: (string) config('sgd.schema', 'IDOSGD'),
            conexionSgd: (string) config('sgd.connection', 'sgd'),
        );
    }

    /**
     * Ejecuta la ingesta completa para un proceso. Devuelve métricas.
     *
     * @param  string|null  $soloDependencia  limita a una dependencia (piloto)
     * @return array{dependencias: int, servidores: int, encargados: int}
     */
    public function ejecutar(ProcesoTransferencia $proceso, ?string $soloDependencia = null): array
    {
        $extraidoEn = Carbon::now();
        $dependencias = $this->leerDependencias($soloDependencia);
        $empleados = $this->leerEmpleados();

        return DB::transaction(function () use ($proceso, $dependencias, $empleados, $soloDependencia, $extraidoEn) {
            $this->publicarDependencias($proceso, $dependencias, $extraidoEn);

            // Códigos SGD de empleados que encargan alguna dependencia (RN-01).
            $encargadosSgd = [];
            foreach ($dependencias as $dep) {
                $cod = $this->texto($dep->encargado);
                if ($cod !== null) {
                    $encargadosSgd[$cod] = true;
                }
            }

            $servidores = $this->publicarServidores($proceso, $empleados, $encargadosSgd, $soloDependencia, $extraidoEn);
            $encargados = $this->resolverEncargados($proceso);

            return [
                'dependencias' => count($dependencias),
                'servidores' => $servidores,
                'encargados' => $encargados,
            ];
        });
    }

    /**
     * Catálogo de dependencias del SGD con jerarquía y encargado.
     *
     * @return array<int, object>
     */
    private function leerDependencias(?string $soloDependencia): array
    {
        $sgd = DB::connection($this->conexionSgd);
        $sql = "SELECT CO_DEPENDENCIA AS codigo, DE_DEPENDENCIA AS nombre,
                       CO_DEPEN_PADRE AS padre, CO_NIVEL AS nivel,
                       CO_EMPLEADO AS encargado, CO_TIPO_ENCARGATURA AS tipo_encargatura,
                       CO_EMP_TITULAR AS titular, IN_BAJA AS baja
                FROM {$this->esquema}.RHTM_DEPENDENCIA";
        $bindings = [];
        if ($soloDependencia !== null) {
            $sql .= ' WHERE CO_DEPENDENCIA = ?';
            $bindings[] = $soloDependencia;
        }

        return $sgd->select($sql, $bindings);
    }

    /**
     * Padrón completo de empleados del SGD.
     *
     * @return array<int, object>
     */
    private function leerEmpleados(): array
    {
        $sgd = DB::connection($this->conexionSgd);
        // CEMP_DENOM es el nombre de pila (no el cargo). El cargo real vive en
        // RHTM_CARGOS, enlazado por CEMP_CO_CARGO.
        $sql = "SELECT e.CEMP_CODEMP AS codigo, e.CEMP_NU_DNI AS dni,
                       e.CEMP_APEPAT AS apellido_paterno, e.CEMP_APEMAT AS apellido_materno,
                       e.CEMP_DENOM AS denominacion, e.CEMP_EST_EMP AS estado,
                       e.CEMP_CO_DEPEND AS dependencia, e.CEMP_EMAIL AS email,
                       c.CCAR_DESCAR AS cargo
                FROM {$this->esquema}.RHTM_PER_EMPLEADOS e
                LEFT JOIN {$this->esquema}.RHTM_CARGOS c
                       ON c.CCAR_CO_CARGO = e.CEMP_CO_CARGO";

        return $sgd->select($sql);
    }

    /**
     * Inserta/actualiza dependencias resolviendo el padre por código. Se procesa
     * por nivel para que el padre exista antes que la hija.
     *
     * @param  array<int, object>  $dependencias
     */
    private function publicarDependencias(ProcesoTransferencia $proceso, array $dependencias, Carbon $extraidoEn): void
    {
        usort($dependencias, fn ($a, $b) => $this->nivel($a->nivel) <=> $this->nivel($b->nivel));

        /** @var array<string, int> $idPorCodigo */
        $idPorCodigo = [];

        foreach ($dependencias as $dep) {
            $codigo = $this->texto($dep->codigo);
            if ($codigo === null) {
                continue;
            }

            $padreCodigo = $this->texto($dep->padre);
            $padreId = $padreCodigo !== null ? ($idPorCodigo[$padreCodigo] ?? null) : null;

            // El nodo '01' es el pliego general en SGD, no una unidad operativa.
            // Las unidades operativas se rigen por centros de costo (00001 Alcaldía como raíz).
            $esActiva = $this->texto($dep->baja) !== '1';
            if ($codigo === '01') {
                $esActiva = false;
            } elseif (str_starts_with($codigo, '01.') && ! in_array($codigo, ['01.01', '01.03.12.04.02'], true)) {
                $esActiva = false;
            }

            // Concejo Municipal (01.01) se subordina a Alcaldía (00001) si existe
            if ($codigo === '01.01') {
                $alcaldiaId = Dependencia::query()
                    ->where('proceso_transferencia_id', $proceso->id)
                    ->where('codigo', '00001')
                    ->value('id');
                if ($alcaldiaId !== null) {
                    $padreId = $alcaldiaId;
                }
            }

            $modelo = Dependencia::updateOrCreate(
                ['proceso_transferencia_id' => $proceso->id, 'codigo' => $codigo],
                [
                    'parent_id' => $padreId,
                    'codigo_sgd' => $codigo,
                    'nombre' => (string) ($this->texto($dep->nombre) ?? $codigo),
                    'nivel' => $this->nivel($dep->nivel),
                    'activa' => $esActiva,
                    'codigo_encargado_sgd' => $this->texto($dep->encargado),
                    'tipo_encargatura' => $this->texto($dep->tipo_encargatura),
                    'codigo_titular_sgd' => $this->texto($dep->titular),
                    'fuente' => FuenteDato::SGD->value,
                    'fuente_referencia' => "RHTM_DEPENDENCIA.CO_DEPENDENCIA={$codigo}",
                    'extraido_en' => $extraidoEn,
                ],
            );

            $idPorCodigo[$codigo] = $modelo->id;
        }
    }

    /**
     * Inserta/actualiza servidores. Solo se publican empleados con DNI válido
     * (8 dígitos): el DNI es la clave de conciliación y la credencial de acceso.
     *
     * @param  array<int, object>  $empleados
     * @param  array<string, bool>  $encargadosSgd
     * @return int cantidad de servidores publicados
     */
    private function publicarServidores(
        ProcesoTransferencia $proceso,
        array $empleados,
        array $encargadosSgd,
        ?string $soloDependencia,
        Carbon $extraidoEn,
    ): int {
        // Mapa código de dependencia => id (del proceso) para resolver el FK.
        $depPorCodigo = Dependencia::query()
            ->where('proceso_transferencia_id', $proceso->id)
            ->pluck('id', 'codigo');

        $total = 0;
        foreach ($empleados as $emp) {
            $dni = $this->dni($emp->dni);
            $codigoSgd = $this->texto($emp->codigo);
            if ($dni === null || $codigoSgd === null) {
                continue; // Sin clave fiable no se concilia (RN-03).
            }

            $depCodigo = $this->texto($emp->dependencia);
            if ($soloDependencia !== null && $depCodigo !== $soloDependencia) {
                continue;
            }

            $dependenciaId = $depCodigo !== null ? ($depPorCodigo[$depCodigo] ?? null) : null;

            Servidor::updateOrCreate(
                ['proceso_transferencia_id' => $proceso->id, 'dni' => $dni],
                [
                    'dependencia_id' => $dependenciaId,
                    'codigo_sgd' => $codigoSgd,
                    'nombres' => (string) ($this->texto($emp->denominacion) ?? $dni),
                    'apellidos' => $this->apellidos($emp),
                    'email' => $this->email($emp->email),
                    'cargo' => $this->texto($emp->cargo),
                    'es_responsable' => isset($encargadosSgd[$codigoSgd]),
                    'fuente' => FuenteDato::SGD->value,
                    'fuente_referencia' => "RHTM_PER_EMPLEADOS.CEMP_CODEMP={$codigoSgd}",
                    'extraido_en' => $extraidoEn,
                ],
            );
            $total++;
        }

        return $total;
    }

    /**
     * Resuelve dependencias.encargado_servidor_id desde el código SGD del
     * encargado hacia el servidor ya cargado (segunda pasada).
     *
     * @return int cantidad de encargados resueltos
     */
    private function resolverEncargados(ProcesoTransferencia $proceso): int
    {
        $servidorPorCodigo = Servidor::query()
            ->where('proceso_transferencia_id', $proceso->id)
            ->whereNotNull('codigo_sgd')
            ->pluck('id', 'codigo_sgd');

        $resueltos = 0;
        $dependencias = Dependencia::query()
            ->where('proceso_transferencia_id', $proceso->id)
            ->whereNotNull('codigo_encargado_sgd')
            ->get();

        foreach ($dependencias as $dep) {
            $servidorId = $servidorPorCodigo[$dep->codigo_encargado_sgd] ?? null;
            if ($servidorId !== null && $dep->encargado_servidor_id !== $servidorId) {
                $dep->update(['encargado_servidor_id' => $servidorId]);
                $resueltos++;
            }
        }

        return $resueltos;
    }

    /** Apellidos "paterno materno", omitiendo partes ausentes. */
    private function apellidos(object $emp): ?string
    {
        $apellidos = trim(implode(' ', array_filter([
            $this->texto($emp->apellido_paterno),
            $this->texto($emp->apellido_materno),
        ])));

        return $apellidos === '' ? null : $apellidos;
    }

    private function texto(mixed $valor): ?string
    {
        if ($valor === null) {
            return null;
        }
        $texto = trim((string) $valor);

        return $texto === '' ? null : $texto;
    }

    private function nivel(mixed $nivel): int
    {
        $texto = $this->texto($nivel);

        return is_numeric($texto) ? (int) $texto : 1;
    }

    /** Normaliza un correo; descarta valores que no sean un email válido. */
    private function email(mixed $valor): ?string
    {
        $texto = $this->texto($valor);
        if ($texto === null) {
            return null;
        }
        $texto = mb_strtolower($texto);

        return filter_var($texto, FILTER_VALIDATE_EMAIL) !== false ? $texto : null;
    }

    /** Normaliza un DNI a 8 dígitos, o null si no cumple el formato. */
    private function dni(mixed $valor): ?string
    {
        $texto = $this->texto($valor);

        return $texto !== null && preg_match('/^[0-9]{8}$/', $texto) === 1 ? $texto : null;
    }
}

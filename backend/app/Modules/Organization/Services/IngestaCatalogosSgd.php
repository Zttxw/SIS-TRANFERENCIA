<?php

declare(strict_types=1);

namespace App\Modules\Organization\Services;

use App\Modules\Organization\Models\EstadoSgd;
use App\Modules\Organization\Models\TipoDocumentalSgd;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Ingesta de SOLO LECTURA de los catálogos del SGD (tipos documentales y estados)
 * hacia copias locales (RN-03). Idempotente: re-ejecutar concilia por clave natural.
 *
 * No muta el SGD. Los catálogos son pequeños (82 tipos, pocos estados por dominio),
 * por lo que se leen y escriben completos en una transacción local.
 */
class IngestaCatalogosSgd
{
    /** Dominios de TDTR_ESTADOS que interesan al proceso documental. */
    private const DOMINIOS_ESTADO = [
        EstadoSgd::DOMINIO_EMISION,
        EstadoSgd::DOMINIO_RECEPCION,
    ];

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
     * Ejecuta la ingesta de ambos catálogos. Devuelve métricas.
     *
     * @return array{tipos: int, estados: int}
     */
    public function ejecutar(): array
    {
        $extraidoEn = Carbon::now();
        $tipos = $this->leerTipos();
        $estados = $this->leerEstados();

        return DB::transaction(function () use ($tipos, $estados, $extraidoEn) {
            return [
                'tipos' => $this->publicarTipos($tipos, $extraidoEn),
                'estados' => $this->publicarEstados($estados, $extraidoEn),
            ];
        });
    }

    /** @return array<int, object> */
    private function leerTipos(): array
    {
        return DB::connection($this->conexionSgd)->select(
            "SELECT CDOC_TIPDOC AS codigo, CDOC_DESDOC AS descripcion, CDOC_INDBAJ AS baja
             FROM {$this->esquema}.SI_MAE_TIPO_DOC"
        );
    }

    /** @return array<int, object> */
    private function leerEstados(): array
    {
        $marcadores = implode(',', array_fill(0, count(self::DOMINIOS_ESTADO), '?'));

        return DB::connection($this->conexionSgd)->select(
            "SELECT DE_TAB AS dominio, CO_EST AS codigo, DE_EST AS descripcion
             FROM {$this->esquema}.TDTR_ESTADOS
             WHERE DE_TAB IN ({$marcadores})",
            self::DOMINIOS_ESTADO,
        );
    }

    /** @param  array<int, object>  $tipos */
    private function publicarTipos(array $tipos, Carbon $extraidoEn): int
    {
        $total = 0;
        foreach ($tipos as $tipo) {
            $codigo = $this->texto($tipo->codigo);
            if ($codigo === null) {
                continue;
            }

            TipoDocumentalSgd::updateOrCreate(
                ['codigo' => $codigo],
                [
                    'descripcion' => $this->texto($tipo->descripcion),
                    'activo' => $this->texto($tipo->baja) === '0',
                    'extraido_en' => $extraidoEn,
                ],
            );
            $total++;
        }

        return $total;
    }

    /** @param  array<int, object>  $estados */
    private function publicarEstados(array $estados, Carbon $extraidoEn): int
    {
        $total = 0;
        foreach ($estados as $estado) {
            $dominio = $this->texto($estado->dominio);
            $codigo = $this->texto($estado->codigo);
            if ($dominio === null || $codigo === null) {
                continue;
            }

            EstadoSgd::updateOrCreate(
                ['dominio' => $dominio, 'codigo' => $codigo],
                [
                    'descripcion' => (string) ($this->texto($estado->descripcion) ?? $codigo),
                    'extraido_en' => $extraidoEn,
                ],
            );
            $total++;
        }

        return $total;
    }

    private function texto(mixed $valor): ?string
    {
        if ($valor === null) {
            return null;
        }
        $texto = trim((string) $valor);

        return $texto === '' ? null : $texto;
    }
}

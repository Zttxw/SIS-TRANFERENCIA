<?php

declare(strict_types=1);

namespace App\Modules\Acervo\Services;

/**
 * Referencia de origen de una fila de acervo digital del SGD:
 * `TDTV_REMITOS CO_DEP_EMI=00025,00092 CO_TIP_DOC_ADM=011 NU_ANN=2026`.
 *
 * Desde la directiva 2026 una fila pertenece a un centro de costo que puede
 * reunir varias dependencias del SGD, por eso `CO_DEP_EMI` admite una lista.
 */
final class AcervoReferenciaSgd
{
    private const PATRON = '/CO_DEP_EMI=(?<deps>[^\s]+)\s+CO_TIP_DOC_ADM=(?<tipo>\S+)\s+NU_ANN=(?<anio>\d{4})/';

    /** @param  list<string>  $dependencias */
    public static function construir(array $dependencias, ?string $tipo, string $anio): string
    {
        $codigos = array_values(array_unique($dependencias));
        sort($codigos);

        return 'TDTV_REMITOS CO_DEP_EMI='.implode(',', $codigos)." CO_TIP_DOC_ADM={$tipo} NU_ANN={$anio}";
    }

    /** @return array{deps: list<string>, tipo: string, anio: string}|null */
    public static function leer(string $referencia): ?array
    {
        if (preg_match(self::PATRON, $referencia, $m) !== 1) {
            return null;
        }

        return [
            'deps' => array_values(array_filter(explode(',', $m['deps']), fn (string $codigo) => $codigo !== '')),
            'tipo' => $m['tipo'],
            'anio' => $m['anio'],
        ];
    }

    /** Une las dependencias de dos referencias de la misma serie y año. */
    public static function fusionar(string $a, string $b): string
    {
        $ra = self::leer($a);
        $rb = self::leer($b);
        if ($ra === null || $rb === null) {
            return $a;
        }

        return self::construir(array_merge($ra['deps'], $rb['deps']), $ra['tipo'], $ra['anio']);
    }
}

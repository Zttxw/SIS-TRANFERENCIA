<?php

declare(strict_types=1);

namespace App\Modules\Acervo\Services;

/**
 * Referencia de origen de una serie digital del SGD (Anexo 03-B):
 * - emitidos:  `TDTV_REMITOS CO_DEP_EMI=00025,00092 CO_TIP_DOC_ADM=011 NU_ANN=2026`
 * - recibidos: `TDTV_DESTINOS CO_DEP_DES=00025 CO_TIP_DOC_ADM=011 NU_ANN=2026`
 *
 * Una serie pertenece a un centro de costo que puede reunir varias
 * dependencias del SGD, por eso la lista de dependencias admite varios códigos.
 */
final class AcervoReferenciaSgd
{
    public const EMITIDOS = 'emitidos';

    public const RECIBIDOS = 'recibidos';

    private const PATRON = '/^(?<tabla>TDTV_REMITOS|TDTV_DESTINOS)\s+CO_DEP_(?:EMI|DES)=(?<deps>[^\s]+)\s+CO_TIP_DOC_ADM=(?<tipo>\S+)\s+NU_ANN=(?<anio>\d{4})/';

    /** @param  list<string>  $dependencias */
    public static function construir(string $sentido, array $dependencias, ?string $tipo, string $anio): string
    {
        $codigos = array_values(array_unique($dependencias));
        sort($codigos);
        $origen = $sentido === self::RECIBIDOS ? 'TDTV_DESTINOS CO_DEP_DES' : 'TDTV_REMITOS CO_DEP_EMI';

        return "{$origen}=".implode(',', $codigos)." CO_TIP_DOC_ADM={$tipo} NU_ANN={$anio}";
    }

    /** @return array{sentido: string, deps: list<string>, tipo: string, anio: string}|null */
    public static function leer(string $referencia): ?array
    {
        if (preg_match(self::PATRON, $referencia, $m) !== 1) {
            return null;
        }

        return [
            'sentido' => $m['tabla'] === 'TDTV_DESTINOS' ? self::RECIBIDOS : self::EMITIDOS,
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

        return self::construir($ra['sentido'], array_merge($ra['deps'], $rb['deps']), $ra['tipo'], $ra['anio']);
    }
}

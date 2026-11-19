<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Services;

use App\Support\Enums\CondicionAnexoActa;
use Illuminate\Validation\ValidationException;

/**
 * Sección III del Acta 07 (RF-62, RN-11): condición de cada documento
 * entregado. Por defecto sale de la presencia de registros (y "otros", de que
 * se hayan descrito otros documentos); lo que fijen las partes antes de firmar
 * prevalece (`manual`).
 */
class CondicionesActa
{
    /** @var array<string, string> clave => denominación oficial */
    public const ITEMS = [
        'anexo_02' => 'Anexo N° 02 — Informe de Gestión',
        'anexo_03' => 'Anexo N° 03 — Registro del Acervo Documentario',
        'anexo_04' => 'Anexo N° 04 — Registro de Bienes Patrimoniales',
        'anexo_05' => 'Anexo N° 05 — Información del Personal a cargo del Centro de Costo',
        'anexo_06' => 'Anexo N° 06 — Bienes No Patrimoniales',
        'otros' => 'Otros documentos',
    ];

    /**
     * Condiciones vigentes: las fijadas a mano se conservan; las demás se
     * recalculan.
     *
     * @param  array<string, mixed>  $guardadas
     * @param  array<string, bool>  $presencia  presenciaAnexos()
     * @return array<string, array{condicion: string, observacion: ?string, manual: bool}>
     */
    public function componer(array $guardadas, array $presencia, ?string $otrosDocumentos): array
    {
        $condiciones = [];
        foreach (array_keys(self::ITEMS) as $item) {
            $guardada = is_array($guardadas[$item] ?? null) ? $guardadas[$item] : [];
            $manual = (bool) ($guardada['manual'] ?? false);
            $condiciones[$item] = [
                'condicion' => $manual ? (string) $guardada['condicion'] : $this->porDefecto($item, $presencia, $otrosDocumentos)->value,
                'observacion' => $guardada['observacion'] ?? null,
                'manual' => $manual,
            ];
        }

        return $condiciones;
    }

    /**
     * Aplica lo que fijan las partes sobre las condiciones vigentes.
     *
     * @param  array<string, array{condicion: string, observacion: ?string, manual: bool}>  $vigentes
     * @param  array<string, array{condicion?: ?string, observacion?: ?string}>  $cambios
     * @return array<string, array{condicion: string, observacion: ?string, manual: bool}>
     *
     * @throws ValidationException si se marca "No aplica" en un anexo que no lo admite.
     */
    public function fijar(array $vigentes, array $cambios): array
    {
        foreach ($cambios as $item => $cambio) {
            if (! isset($vigentes[$item])) {
                continue;
            }
            if (array_key_exists('condicion', $cambio) && $cambio['condicion'] !== null) {
                $condicion = CondicionAnexoActa::from($cambio['condicion']);
                if (! $condicion->admitidaPara($item)) {
                    throw ValidationException::withMessages([
                        "condiciones.{$item}.condicion" => '"No aplica" solo corresponde al Anexo 06 y a otros documentos.',
                    ]);
                }
                $vigentes[$item]['condicion'] = $condicion->value;
                $vigentes[$item]['manual'] = true;
            }
            if (array_key_exists('observacion', $cambio)) {
                $observacion = trim((string) $cambio['observacion']);
                $vigentes[$item]['observacion'] = $observacion === '' ? null : $observacion;
            }
        }

        return $vigentes;
    }

    /**
     * Filas de la sección III para el PDF.
     *
     * @param  array<string, array{condicion: string, observacion: ?string, manual: bool}>  $condiciones
     * @return list<array{nombre: string, condicion: string, observacion: ?string, admite_no_aplica: bool}>
     */
    public function filas(array $condiciones): array
    {
        $filas = [];
        foreach (self::ITEMS as $item => $nombre) {
            $filas[] = [
                'nombre' => $nombre,
                'condicion' => $condiciones[$item]['condicion'] ?? CondicionAnexoActa::NO_ENTREGADO->value,
                'observacion' => $condiciones[$item]['observacion'] ?? null,
                'admite_no_aplica' => CondicionAnexoActa::NO_APLICA->admitidaPara($item),
            ];
        }

        return $filas;
    }

    /** @param array<string, bool> $presencia */
    private function porDefecto(string $item, array $presencia, ?string $otrosDocumentos): CondicionAnexoActa
    {
        if ($item === 'otros') {
            return trim((string) $otrosDocumentos) === '' ? CondicionAnexoActa::NO_APLICA : CondicionAnexoActa::ENTREGADO;
        }

        return ($presencia[$item] ?? false) ? CondicionAnexoActa::ENTREGADO : CondicionAnexoActa::NO_ENTREGADO;
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Services;

use App\Modules\Transferencia\Models\Observacion;

/**
 * Sección IV del Acta 07 (RF-63, D-07): las observaciones que el coordinador
 * ETTE dejó como constancia al revisar la entrega, con la documentación a la
 * que se refieren.
 */
class ObservacionesActa
{
    /** @return list<array{n: int, descripcion: string, documentacion: string, autor: string}> */
    public function delCentro(int $dependenciaId, int $procesoId): array
    {
        return Observacion::query()->vigentes()->with('autor:id,name')
            ->where('proceso_transferencia_id', $procesoId)
            ->where('dependencia_id', $dependenciaId)
            ->orderBy('created_at')->orderBy('id')
            ->get()
            ->values()
            ->map(fn (Observacion $observacion, int $i): array => [
                'n' => $i + 1,
                'descripcion' => (string) $observacion->descripcion,
                'documentacion' => $observacion->etiquetaAnexo()
                    .($observacion->observable_id === null ? ' (anexo completo)' : ' — registro N° '.$observacion->observable_id),
                'autor' => trim(($observacion->autor?->name ?? '').' · '.($observacion->en_calidad_de?->etiqueta() ?? ''), ' ·'),
            ])
            ->all();
    }
}

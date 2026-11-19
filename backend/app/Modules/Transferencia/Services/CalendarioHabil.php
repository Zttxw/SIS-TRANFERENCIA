<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Services;

use App\Modules\Transferencia\Models\Feriado;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;

/**
 * Días hábiles del cronograma (RF-22): de lunes a viernes, sin los feriados
 * registrados. Trabaja con fechas (día de Lima), sin hora.
 */
class CalendarioHabil
{
    /** @var array<string, true>|null */
    private ?array $feriados = null;

    public function esHabil(CarbonInterface $fecha): bool
    {
        return ! $fecha->isWeekend() && ! isset($this->feriados()[$fecha->format('Y-m-d')]);
    }

    /**
     * Fecha que queda `$dias` días hábiles antes de la indicada (RN-03: el
     * vencimiento interno es 2 días hábiles antes del plazo CGR). Con 0 días
     * devuelve la misma fecha.
     */
    public function restarDiasHabiles(CarbonInterface $fecha, int $dias): Carbon
    {
        $actual = Carbon::parse($fecha->format('Y-m-d'));
        while ($dias > 0) {
            $actual->subDay();
            if ($this->esHabil($actual)) {
                $dias--;
            }
        }

        return $actual;
    }

    /**
     * Días hábiles que faltan desde `$desde` (excluido) hasta `$hasta`
     * (incluido). 0 si `$hasta` no es posterior a `$desde`.
     */
    public function diasHabilesHasta(CarbonInterface $desde, CarbonInterface $hasta): int
    {
        $actual = Carbon::parse($desde->format('Y-m-d'));
        $fin = $hasta->format('Y-m-d');
        $dias = 0;
        while ($actual->format('Y-m-d') < $fin) {
            $actual->addDay();
            if ($this->esHabil($actual)) {
                $dias++;
            }
        }

        return $dias;
    }

    /** Olvida los feriados leídos (tras modificar el calendario). */
    public function refrescar(): void
    {
        $this->feriados = null;
    }

    /** @return array<string, true> */
    private function feriados(): array
    {
        return $this->feriados ??= Feriado::query()->pluck('fecha')
            ->mapWithKeys(fn (Carbon $fecha): array => [$fecha->format('Y-m-d') => true])
            ->all();
    }
}

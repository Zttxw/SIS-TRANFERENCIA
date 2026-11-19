<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Services;

use App\Modules\Transferencia\Models\Feriado;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Calendario de días no laborables (RF-22). Cada cambio recalcula, en la misma
 * transacción, los vencimientos derivados del plazo CGR.
 */
class FeriadoService
{
    public function __construct(private readonly CronogramaService $cronograma) {}

    /** @return Collection<int, Feriado> */
    public function listar(?int $anio = null): Collection
    {
        return Feriado::query()
            ->when($anio !== null, fn ($q) => $q->whereYear('fecha', $anio))
            ->orderBy('fecha')
            ->get();
    }

    /** @param array<string, mixed> $datos */
    public function crear(array $datos): Feriado
    {
        return DB::transaction(function () use ($datos): Feriado {
            $feriado = Feriado::create($datos);
            $this->cronograma->recalcularPlazosCgr();

            return $feriado;
        });
    }

    /** @param array<string, mixed> $datos */
    public function actualizar(Feriado $feriado, array $datos): Feriado
    {
        return DB::transaction(function () use ($feriado, $datos): Feriado {
            $feriado->update($datos);
            $this->cronograma->recalcularPlazosCgr();

            return $feriado->fresh();
        });
    }

    public function eliminar(Feriado $feriado): void
    {
        DB::transaction(function () use ($feriado): void {
            $feriado->delete();
            $this->cronograma->recalcularPlazosCgr();
        });
    }
}

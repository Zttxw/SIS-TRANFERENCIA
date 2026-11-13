<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Services;

use App\Modules\Transferencia\Models\CronogramaActividad;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Http\ApiResponse;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Carbon;

/**
 * Reglas del cronograma del proceso (RF-007, C-03). El vencimiento de una
 * actividad bloquea la operación que gobierna (por ahora, la remisión: lo
 * confirmado). Las demás operaciones bloqueables (firma, visto bueno,
 * consolidación) y la forma de retomar un trámite vencido siguen en D-03; este
 * servicio solo aplica lo confirmado y expone un punto único para ampliarlo.
 */
class CronogramaService
{
    public const OPERACION_REMISION = 'remision';

    /**
     * Lista las actividades del cronograma del proceso activo, ordenadas por
     * etapa/orden. Añade su situación de vencimiento derivada.
     *
     * @return Collection<int, CronogramaActividad>
     */
    public function listar(?int $procesoId = null): Collection
    {
        $procesoId = $procesoId ?? $this->resolverProcesoActivoId();

        return CronogramaActividad::query()
            ->with('dependencia:id,codigo,nombre')
            ->where('proceso_transferencia_id', $procesoId)
            ->orderBy('orden')
            ->orderBy('fecha_vencimiento')
            ->get();
    }

    /**
     * Crea una actividad del cronograma. La auditoría (autor/fecha/valores) la
     * registra el trait Auditable del modelo (criterio RF-007).
     *
     * @param  array<string, mixed>  $datos
     */
    public function crear(array $datos, ?int $procesoId = null): CronogramaActividad
    {
        $datos['proceso_transferencia_id'] = $procesoId ?? $this->resolverProcesoActivoId();
        $datos['operacion'] = $datos['operacion'] ?? self::OPERACION_REMISION;

        return CronogramaActividad::create($datos)->fresh();
    }

    /**
     * Actualiza una actividad (p. ej. una prórroga de plazo). El movimiento de
     * auditoría conserva los valores anteriores y nuevos.
     *
     * @param  array<string, mixed>  $datos
     */
    public function actualizar(int $id, array $datos): CronogramaActividad
    {
        $actividad = CronogramaActividad::findOrFail($id);
        $actividad->fill($datos)->save();

        return $actividad->fresh();
    }

    public function eliminar(int $id): void
    {
        CronogramaActividad::findOrFail($id)->delete();
    }

    /**
     * Actividad vencida que bloquea la operación dada para una dependencia, o
     * null si no hay bloqueo. Considera las actividades generales del proceso
     * y las específicas de la dependencia.
     */
    public function actividadBloqueante(
        int $procesoId,
        int $dependenciaId,
        string $operacion,
        ?Carbon $referencia = null,
    ): ?CronogramaActividad {
        $referencia = $referencia ?? Carbon::now();

        $actividades = CronogramaActividad::query()
            ->where('proceso_transferencia_id', $procesoId)
            ->paraOperacion($operacion)
            ->aplicablesA($dependenciaId)
            ->whereNotNull('fecha_vencimiento')
            ->get();

        foreach ($actividades as $actividad) {
            if ($actividad->estaVencida($referencia)) {
                return $actividad;
            }
        }

        return null;
    }

    /**
     * Lanza 409 si la operación está bloqueada por una actividad vencida. El
     * bloqueo se cumple en la API, no solo en la interfaz (criterio RF-007). La
     * respuesta indica la causa y el plazo aplicable.
     */
    public function exigirPlazoVigente(
        int $procesoId,
        int $dependenciaId,
        string $operacion,
        ?Carbon $referencia = null,
    ): void {
        $actividad = $this->actividadBloqueante($procesoId, $dependenciaId, $operacion, $referencia);

        if ($actividad === null) {
            return;
        }

        $vencimiento = $actividad->instanteVencimiento();
        $vencioLima = $vencimiento?->copy()->setTimezone(CronogramaActividad::ZONA_PLAZO);
        // Con hora de corte se informa fecha y hora de Lima; sin ella, solo el día.
        $cuando = $actividad->hora_vencimiento !== null
            ? $vencioLima?->format('d/m/Y H:i').' (hora de Lima)'
            : $actividad->fecha_vencimiento?->toDateString();

        throw new HttpResponseException(
            ApiResponse::error(
                'La operación está bloqueada: el plazo de la actividad "'.$actividad->nombre.'" venció el '
                    .$cuando.'.',
                409,
                [
                    'cronograma' => [
                        'actividad_id' => $actividad->id,
                        'actividad' => $actividad->nombre,
                        'operacion' => $actividad->operacion,
                        'fecha_vencimiento' => $actividad->fecha_vencimiento?->toDateString(),
                        'hora_vencimiento' => $actividad->hora_vencimiento,
                        'vencio_en' => $vencimiento?->toIso8601String(),
                    ],
                ],
            )
        );
    }

    private function resolverProcesoActivoId(): int
    {
        return (int) (ProcesoTransferencia::where('estado', 'abierto')->value('id') ?? 1);
    }
}

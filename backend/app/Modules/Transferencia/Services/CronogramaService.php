<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Services;

use App\Modules\Transferencia\Models\CronogramaActividad;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\AccionPlazo;
use App\Support\Http\ApiResponse;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Carbon;

/**
 * Reglas del cronograma del proceso (RF-20 a RF-22, RN-03, D-12).
 *
 * - Con plazo CGR, el vencimiento interno es `dias_habiles_antes` días hábiles
 *   antes de esa fecha (por defecto 2) y se recalcula si cambia el calendario.
 * - El vencimiento de una actividad bloquea, en la API, las acciones de la
 *   etapa que gobierna (OperacionCronograma): presentar y aceptar (actividad 3),
 *   firmar y remitir (actividad 4), remitir (remisión).
 * - La sustitución de un coordinador no toca el cronograma (RF-25).
 */
class CronogramaService
{
    public function __construct(private readonly CalendarioHabil $calendario) {}

    /**
     * Actividades del cronograma del proceso activo, por orden y vencimiento.
     *
     * @return Collection<int, CronogramaActividad>
     */
    public function listar(?int $procesoId = null): Collection
    {
        return $this->actividadesDelProceso($procesoId ?? $this->resolverProcesoActivoId())
            ->load('dependencia:id,codigo,nombre');
    }

    /**
     * Crea una actividad. La auditoría la registra el trait Auditable.
     *
     * @param  array<string, mixed>  $datos
     */
    public function crear(array $datos, ?int $procesoId = null): CronogramaActividad
    {
        $actividad = new CronogramaActividad($datos);
        $actividad->proceso_transferencia_id = $procesoId ?? $this->resolverProcesoActivoId();
        $this->aplicarPlazoCgr($actividad);
        $actividad->save();

        return $actividad->fresh();
    }

    /**
     * Actualiza una actividad (p. ej. una prórroga). El movimiento de auditoría
     * conserva los valores anteriores y nuevos.
     *
     * @param  array<string, mixed>  $datos
     */
    public function actualizar(int $id, array $datos): CronogramaActividad
    {
        $actividad = CronogramaActividad::findOrFail($id);
        $actividad->fill($datos);
        $this->aplicarPlazoCgr($actividad);
        $actividad->save();

        return $actividad->fresh();
    }

    public function eliminar(int $id): void
    {
        CronogramaActividad::findOrFail($id)->delete();
    }

    /**
     * Recalcula el vencimiento de las actividades con plazo CGR (tras cambiar
     * los feriados). Devuelve cuántas cambiaron.
     */
    public function recalcularPlazosCgr(): int
    {
        $this->calendario->refrescar();
        $cambiadas = 0;
        CronogramaActividad::query()->whereNotNull('fecha_cgr')->get()
            ->each(function (CronogramaActividad $actividad) use (&$cambiadas): void {
                $this->aplicarPlazoCgr($actividad);
                if ($actividad->isDirty('fecha_vencimiento')) {
                    $actividad->save();
                    $cambiadas++;
                }
            });

        return $cambiadas;
    }

    /**
     * Actividad vencida que bloquea la acción para el CC, o null. Considera las
     * actividades generales del proceso y las específicas del CC.
     */
    public function actividadBloqueante(
        int $procesoId,
        int $dependenciaId,
        AccionPlazo $accion,
        ?Carbon $referencia = null,
    ): ?CronogramaActividad {
        return CronogramaActividad::query()
            ->where('proceso_transferencia_id', $procesoId)
            ->queBloquean($accion)
            ->aplicablesA($dependenciaId)
            ->whereNotNull('fecha_vencimiento')
            ->get()
            ->first(fn (CronogramaActividad $actividad): bool => $actividad->estaVencida($referencia));
    }

    /**
     * Lanza 409 si la acción está bloqueada por una actividad vencida. El
     * bloqueo se cumple en la API, no solo en la interfaz; la respuesta indica
     * la causa y el plazo aplicable.
     */
    public function exigirPlazoVigente(
        int $procesoId,
        int $dependenciaId,
        AccionPlazo $accion,
        ?Carbon $referencia = null,
    ): void {
        $actividad = $this->actividadBloqueante($procesoId, $dependenciaId, $accion, $referencia);

        if ($actividad === null) {
            return;
        }

        $vencimiento = $actividad->instanteVencimiento();
        $vencioLima = $vencimiento?->copy()->setTimezone(CronogramaActividad::ZONA_PLAZO);
        // Con hora de corte se informa fecha y hora de Lima; sin ella, solo el día.
        $cuando = $actividad->hora_vencimiento !== null
            ? $vencioLima?->format('d/m/Y H:i').' (hora de Lima)'
            : $actividad->fecha_vencimiento?->format('d/m/Y');

        throw new HttpResponseException(
            ApiResponse::error(
                'No se puede '.mb_strtolower($accion->etiqueta()).': el plazo de la actividad "'.$actividad->nombre
                    .'" venció el '.$cuando.'.',
                409,
                [
                    'cronograma' => [
                        'actividad_id' => $actividad->id,
                        'actividad' => $actividad->nombre,
                        'accion' => $accion->value,
                        'operacion' => $actividad->operacion->value,
                        'fecha_cgr' => $actividad->fecha_cgr?->toDateString(),
                        'fecha_vencimiento' => $actividad->fecha_vencimiento?->toDateString(),
                        'hora_vencimiento' => $actividad->hora_vencimiento,
                        'vencio_en' => $vencimiento?->toIso8601String(),
                    ],
                ],
            )
        );
    }

    /**
     * Situación del plazo de la acción para un CC (F-16): la actividad vencida
     * que la bloquea o, si no hay, la de vencimiento más próximo, con los días
     * hábiles que faltan. null si ninguna actividad la gobierna.
     *
     * @param  Collection<int, CronogramaActividad>  $actividades  del proceso (actividadesDelProceso)
     * @return array{accion: string, accion_etiqueta: string, actividad: string, fecha_vencimiento: string,
     *     hora_vencimiento: ?string, dias_habiles: int, vencido: bool}|null
     */
    public function situacionPlazo(Collection $actividades, int $dependenciaId, AccionPlazo $accion, ?Carbon $referencia = null): ?array
    {
        $referencia ??= Carbon::now();
        $aplicables = $actividades->filter(fn (CronogramaActividad $a): bool => $a->fecha_vencimiento !== null
            && ! $a->estado?->estaCompletada()
            && in_array($accion, $a->operacion->accionesBloqueadas(), true)
            && ($a->dependencia_id === null || $a->dependencia_id === $dependenciaId));

        $actividad = $aplicables->first(fn (CronogramaActividad $a): bool => $a->estaVencida($referencia))
            ?? $aplicables->sortBy(fn (CronogramaActividad $a): int => $a->instanteVencimiento()->getTimestamp())->first();

        if ($actividad === null) {
            return null;
        }
        $vencido = $actividad->estaVencida($referencia);

        return [
            'accion' => $accion->value,
            'accion_etiqueta' => $accion->etiqueta(),
            'actividad' => $actividad->nombre,
            'fecha_vencimiento' => $actividad->fecha_vencimiento->toDateString(),
            'hora_vencimiento' => $actividad->hora_vencimiento,
            'dias_habiles' => $vencido ? 0 : $this->calendario->diasHabilesHasta(
                $referencia->copy()->setTimezone(CronogramaActividad::ZONA_PLAZO),
                $actividad->fecha_vencimiento,
            ),
            'vencido' => $vencido,
        ];
    }

    /** @return Collection<int, CronogramaActividad> */
    public function actividadesDelProceso(int $procesoId): Collection
    {
        return CronogramaActividad::query()
            ->where('proceso_transferencia_id', $procesoId)
            ->orderBy('orden')
            ->orderBy('fecha_vencimiento')
            ->get();
    }

    /** Con plazo CGR, el vencimiento interno se deriva en días hábiles (RN-03). */
    private function aplicarPlazoCgr(CronogramaActividad $actividad): void
    {
        if (! $actividad->usaPlazoCgr()) {
            return;
        }
        $vencimiento = $this->calendario->restarDiasHabiles($actividad->fecha_cgr, (int) ($actividad->dias_habiles_antes ?? 2));
        if ($actividad->fecha_vencimiento?->toDateString() !== $vencimiento->toDateString()) {
            $actividad->fecha_vencimiento = $vencimiento->toDateString();
        }
    }

    private function resolverProcesoActivoId(): int
    {
        return (int) (ProcesoTransferencia::where('estado', 'abierto')->value('id') ?? 1);
    }
}

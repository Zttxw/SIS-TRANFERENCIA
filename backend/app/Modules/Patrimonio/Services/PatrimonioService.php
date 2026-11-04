<?php

declare(strict_types=1);

namespace App\Modules\Patrimonio\Services;

use App\Models\User;
use App\Modules\Patrimonio\Models\BienPatrimonial;
use App\Modules\Patrimonio\Models\VerificacionBien;
use App\Support\Enums\EstadoConservacion;
use App\Support\Enums\EstadoVerificacionBien;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class PatrimonioService
{
    /**
     * Lista los bienes patrimoniales con filtros y paginación.
     */
    public function listarBienes(array $filtros = []): LengthAwarePaginator
    {
        $query = BienPatrimonial::query()
            ->with(['dependencia', 'servidor', 'verificacion.verificadoPor'])
            ->orderBy('codigo_patrimonial');

        if (! empty($filtros['dependencia_id'])) {
            $query->where('dependencia_id', (int) $filtros['dependencia_id']);
        }

        if (! empty($filtros['servidor_id'])) {
            $query->where('servidor_id', (int) $filtros['servidor_id']);
        }

        if (! empty($filtros['search'])) {
            $term = trim((string) $filtros['search']);
            $query->where(function ($q) use ($term) {
                $q->where('codigo_patrimonial', 'ilike', "%{$term}%")
                    ->orWhere('denominacion', 'ilike', "%{$term}%")
                    ->orWhere('serie', 'ilike', "%{$term}%")
                    ->orWhere('marca', 'ilike', "%{$term}%")
                    ->orWhere('modelo', 'ilike', "%{$term}%");
            });
        }

        if (! empty($filtros['estado_verificacion'])) {
            $estado = (string) $filtros['estado_verificacion'];
            $query->whereHas('verificacion', function ($q) use ($estado) {
                $q->where('estado', $estado);
            });
        }

        $perPage = isset($filtros['per_page']) ? min((int) $filtros['per_page'], 100) : 15;

        return $query->paginate($perPage);
    }

    /**
     * Obtiene el detalle de un bien patrimonial con sus relaciones.
     */
    public function obtenerBien(int $id): BienPatrimonial
    {
        return BienPatrimonial::with([
            'dependencia',
            'servidor',
            'verificacion.verificadoPor',
            'observaciones.autor',
            'evidencias',
        ])->findOrFail($id);
    }

    /**
     * Registra o actualiza la verificación física de un bien por un usuario (RN-04, RN-05).
     * No altera el registro original del SIGA (RN-06).
     */
    public function verificarBien(int $id, array $datos, User $usuario): BienPatrimonial
    {
        return DB::transaction(function () use ($id, $datos, $usuario) {
            $bien = BienPatrimonial::findOrFail($id);

            $estadoEnum = $datos['estado'] instanceof EstadoVerificacionBien
                ? $datos['estado']
                : EstadoVerificacionBien::from((string) $datos['estado']);

            $conservacionEnum = ! empty($datos['estado_conservacion'])
                ? ($datos['estado_conservacion'] instanceof EstadoConservacion
                    ? $datos['estado_conservacion']
                    : EstadoConservacion::from((string) $datos['estado_conservacion']))
                : null;

            $verificacion = VerificacionBien::updateOrCreate(
                ['bien_patrimonial_id' => $bien->id],
                [
                    'verificado_por_id' => $usuario->id,
                    'estado' => $estadoEnum,
                    'estado_conservacion' => $conservacionEnum,
                    'observacion' => $datos['observacion'] ?? null,
                    'verificado_en' => Carbon::now(),
                ]
            );

            // Si hay observación, también la vinculamos como observación polimórfica (RN-10)
            if (! empty($datos['observacion']) && $estadoEnum->requiereObservacion()) {
                $bien->observaciones()->create([
                    'proceso_transferencia_id' => $bien->proceso_transferencia_id,
                    'autor_id' => $usuario->id,
                    'descripcion' => $datos['observacion'],
                    'estado' => 'pendiente',
                ]);
            }

            return $bien->load(['dependencia', 'servidor', 'verificacion.verificadoPor']);
        });
    }

    /**
     * Calcula métricas y resumen de verificación para el Dashboard.
     */
    public function obtenerResumen(?int $dependenciaId = null): array
    {
        $query = BienPatrimonial::query();
        if ($dependenciaId !== null) {
            $query->where('dependencia_id', $dependenciaId);
        }

        $total = (clone $query)->count();
        $valorTotal = (clone $query)->sum('valor') ?? 0.0;

        $confirmados = (clone $query)->whereHas('verificacion', fn ($q) => $q->where('estado', EstadoVerificacionBien::CONFIRMADO->value))->count();
        $noUbicados = (clone $query)->whereHas('verificacion', fn ($q) => $q->where('estado', EstadoVerificacionBien::NO_UBICADO->value))->count();
        $conObservacion = (clone $query)->whereHas('verificacion', fn ($q) => $q->where('estado', EstadoVerificacionBien::CON_OBSERVACION->value))->count();
        $pendientes = $total - ($confirmados + $noUbicados + $conObservacion);

        $porcentajeAvance = $total > 0
            ? round((($confirmados + $noUbicados + $conObservacion) / $total) * 100, 1)
            : 0.0;

        return [
            'total_bienes' => $total,
            'valor_total' => (float) $valorTotal,
            'confirmados' => $confirmados,
            'pendientes' => max(0, $pendientes),
            'no_ubicados' => $noUbicados,
            'con_observacion' => $conObservacion,
            'porcentaje_avance' => $porcentajeAvance,
        ];
    }
}

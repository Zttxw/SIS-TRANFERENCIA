<?php

declare(strict_types=1);

namespace App\Modules\Documentos\Services;

use App\Models\User;
use App\Modules\Documentos\Models\DocumentoPendiente;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\FuenteDato;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class DocumentoPendienteService
{
    /**
     * Lista los asuntos/documentos pendientes de atención (Anexo 01).
     */
    public function listar(array $filtros = []): LengthAwarePaginator
    {
        $query = DocumentoPendiente::query()
            ->with(['dependencia', 'responsable', 'observaciones'])
            ->orderByDesc('fecha_documento')
            ->orderByDesc('id');

        if (! empty($filtros['dependencia_id'])) {
            $query->where('dependencia_id', (int) $filtros['dependencia_id']);
        }

        if (! empty($filtros['estado_atencion'])) {
            $query->where('estado_atencion', $filtros['estado_atencion']);
        }

        if (! empty($filtros['search'])) {
            $term = trim((string) $filtros['search']);
            $query->where(function ($q) use ($term) {
                $q->where('numero_documento', 'ilike', "%{$term}%")
                    ->orWhere('asunto', 'ilike', "%{$term}%")
                    ->orWhere('tipo_documento', 'ilike', "%{$term}%");
            });
        }

        $perPage = isset($filtros['per_page']) ? min((int) $filtros['per_page'], 100) : 15;

        return $query->paginate($perPage);
    }

    /**
     * Registra o actualiza un documento/asunto pendiente (Anexo 01).
     */
    public function guardar(array $datos, User $usuario, ?int $id = null, ?int $procesoId = null): DocumentoPendiente
    {
        $procesoId = $procesoId ?? $this->resolverProcesoActivoId();

        $atributos = [
            'proceso_transferencia_id' => $procesoId,
            'dependencia_id' => (int) $datos['dependencia_id'],
            'servidor_responsable_id' => $datos['servidor_responsable_id'] ?? null,
            'numero_documento' => $datos['numero_documento'] ?? null,
            'tipo_documento' => $datos['tipo_documento'] ?? null,
            'asunto' => $datos['asunto'],
            'fecha_documento' => $datos['fecha_documento'] ?? null,
            'estado_atencion' => $datos['estado_atencion'] ?? 'PENDIENTE',
            'accion_pendiente' => $datos['accion_pendiente'] ?? null,
            'observaciones' => $datos['observaciones'] ?? null,
        ];

        if ($id !== null) {
            $documento = DocumentoPendiente::findOrFail($id);
            $documento->update($atributos);

            return $documento;
        }

        $atributos['fuente'] = FuenteDato::MANUAL->value;
        $atributos['extraido_en'] = now();

        return DocumentoPendiente::create($atributos);
    }

    /**
     * Elimina lógicamente un documento pendiente.
     */
    public function eliminar(int $id): bool
    {
        $documento = DocumentoPendiente::findOrFail($id);

        return (bool) $documento->delete();
    }

    /**
     * Resumen estadístico de pendientes para el Anexo 01.
     *
     * @return array<string, mixed>
     */
    public function resumen(int $dependenciaId): array
    {
        $total = DocumentoPendiente::where('dependencia_id', $dependenciaId)->count();
        $porEstado = DocumentoPendiente::where('dependencia_id', $dependenciaId)
            ->selectRaw('COALESCE(estado_atencion, \'SIN ESTADO\') as estado, count(*) as cantidad')
            ->groupBy('estado_atencion')
            ->pluck('cantidad', 'estado')
            ->toArray();

        return [
            'dependencia_id' => $dependenciaId,
            'total_pendientes' => $total,
            'por_estado' => $porEstado,
        ];
    }

    private function resolverProcesoActivoId(): int
    {
        $proceso = ProcesoTransferencia::where('estado', 'abierto')
            ->latest('id')
            ->first();

        if (! $proceso) {
            $proceso = ProcesoTransferencia::firstOrCreate(
                ['anio' => 2026],
                [
                    'nombre' => 'Transferencia de Gestión 2026',
                    'fecha_corte' => '2026-12-31',
                    'estado' => 'abierto',
                    'descripcion' => 'Proceso de transferencia de gestión 2026 — MDSJ.',
                ],
            );
        }

        return $proceso->id;
    }
}

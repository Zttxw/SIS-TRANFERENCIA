<?php

declare(strict_types=1);

namespace App\Modules\Documentos\Services;

use App\Models\User;
use App\Modules\Documentos\Models\DocumentoPendiente;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Concerns\RespetaEstadoEntrega;
use App\Support\Enums\FuenteDato;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class DocumentoPendienteService
{
    use RespetaEstadoEntrega;

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

        // Acotación por ámbito (F8): lista de dependencias accesibles al usuario.
        if (array_key_exists('dependencia_ids', $filtros) && $filtros['dependencia_ids'] !== null) {
            $query->whereIn('dependencia_id', $filtros['dependencia_ids']);
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
     * E2 (RF-002, D-10): drill-down de un indicador al listado documental que lo
     * sustenta. Comparte los MISMOS filtros/ámbito/periodo que el conteo del
     * indicador (misma firma que `listar`), de modo que «35 enviados» abre
     * exactamente esos 35 documentos y no una página arbitraria.
     *
     * Por documento se expone `original_sgd`: si el registro proviene del SGD, el
     * original está «disponible según permiso» (enlace/indicador), SIN traer el
     * archivo — la ingesta solo guarda agregados y el acceso al repositorio de
     * archivos SGD y su difusión siguen pendientes (D-10). Un registro manual no
     * tiene original en el SGD.
     *
     * @param  array<string, mixed>  $filtros
     * @return array<string, mixed>
     */
    public function listarParaIndicador(array $filtros = [], bool $puedeVerOriginales = false): array
    {
        $pagina = $this->listar($filtros);

        $items = collect($pagina->items())->map(function (DocumentoPendiente $doc) use ($puedeVerOriginales) {
            $esSgd = $doc->fuente === FuenteDato::SGD;

            return [
                'id' => $doc->id,
                'numero_documento' => $doc->numero_documento,
                'tipo_documento' => $doc->tipo_documento,
                'asunto' => $doc->asunto,
                'sumilla' => $doc->sumilla,
                'fecha_documento' => $doc->fecha_documento?->toDateString(),
                'estado_atencion' => $doc->estado_atencion,
                'dependencia_id' => $doc->dependencia_id,
                'fuente' => $doc->fuente,
                // Estado del original SGD, sin servir el archivo (D-10):
                //  - disponible: existe en el SGD y el usuario está autorizado;
                //  - restringido: existe pero el perfil no puede verlo;
                //  - no_aplica: registro manual, no tiene original en el SGD.
                'original_sgd' => ! $esSgd
                    ? 'no_aplica'
                    : ($puedeVerOriginales ? 'disponible' : 'restringido'),
            ];
        })->all();

        return [
            'total' => $pagina->total(),
            'per_page' => $pagina->perPage(),
            'current_page' => $pagina->currentPage(),
            'last_page' => $pagina->lastPage(),
            'items' => $items,
        ];
    }

    /**
     * Registra o actualiza un documento/asunto pendiente (Anexo 01).
     */
    public function guardar(array $datos, User $usuario, ?int $id = null, ?int $procesoId = null): DocumentoPendiente
    {
        $procesoId = $procesoId ?? $this->resolverProcesoActivoId();

        $this->exigirEntregaModificable((int) $datos['dependencia_id'], $procesoId);

        $atributos = [
            'proceso_transferencia_id' => $procesoId,
            'dependencia_id' => (int) $datos['dependencia_id'],
            'servidor_responsable_id' => $datos['servidor_responsable_id'] ?? null,
            'numero_documento' => $datos['numero_documento'] ?? null,
            'tipo_documento' => $datos['tipo_documento'] ?? null,
            'asunto' => $datos['asunto'],
            'sumilla' => $datos['sumilla'] ?? null,
            'justificacion_pendiente' => $datos['justificacion_pendiente'] ?? null,
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
        $this->exigirEntregaModificable((int) $documento->dependencia_id);

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

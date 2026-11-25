<?php

declare(strict_types=1);

namespace App\Modules\Acervo\Services;

use App\Models\User;
use App\Modules\Acervo\Models\AcervoDocumental;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Concerns\RespetaEstadoEntrega;
use App\Support\Enums\FuenteDato;
use App\Support\Enums\TipoAcervo;
use App\Support\Http\ApiResponse;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Arr;

class AcervoService
{
    use RespetaEstadoEntrega;

    /**
     * Lista los registros de acervo documental con filtros y paginación.
     */
    public function listar(array $filtros = []): LengthAwarePaginator
    {
        $query = AcervoDocumental::query()
            ->where('proceso_transferencia_id', $this->resolverProcesoActivoId())
            ->with(['dependencia', 'registradoPor', 'evidencias'])
            ->orderBy('id', 'desc');

        if (! empty($filtros['dependencia_id'])) {
            $query->where('dependencia_id', (int) $filtros['dependencia_id']);
        }

        // Acotación por ámbito (F8): lista de dependencias accesibles al usuario.
        if (array_key_exists('dependencia_ids', $filtros) && $filtros['dependencia_ids'] !== null) {
            $query->whereIn('dependencia_id', $filtros['dependencia_ids']);
        }

        if (! empty($filtros['tipo'])) {
            $query->where('tipo', (string) $filtros['tipo']);
        }

        if (! empty($filtros['search'])) {
            $term = trim((string) $filtros['search']);
            $query->where(function ($q) use ($term) {
                $q->whereLike('serie_documental', "%{$term}%")
                    ->orWhereLike('unidad_conservacion', "%{$term}%")
                    ->orWhereLike('ubicacion', "%{$term}%");

                if (ctype_digit($term)) {
                    $q->orWhere('anio', (int) $term);
                }
            });
        }

        $perPage = isset($filtros['per_page']) ? min((int) $filtros['per_page'], 100) : 15;

        return $query->paginate($perPage);
    }

    /**
     * Registra una serie física (Anexo 03-A).
     *
     * @param  array{dependencia_id: int, serie_documental: string, anio: int, folios: int, unidad_conservacion: string, ubicacion: string}  $datos
     */
    public function crear(array $datos, User $usuario, ?int $procesoId = null): AcervoDocumental
    {
        $procesoId = $procesoId ?? $this->resolverProcesoActivoId();

        $this->exigirEntregaModificable((int) $datos['dependencia_id'], $procesoId);

        return AcervoDocumental::create([
            ...$datos,
            'proceso_transferencia_id' => $procesoId,
            'registrado_por_id' => $usuario->id,
            'tipo' => TipoAcervo::FISICO,
            'fuente' => FuenteDato::MANUAL->value,
        ]);
    }

    /**
     * Actualiza una serie física. La dependencia no cambia al editar.
     *
     * @param  array{serie_documental: string, anio: int, folios: int, unidad_conservacion: string, ubicacion: string}  $datos
     */
    public function actualizar(int $id, array $datos): AcervoDocumental
    {
        $acervo = $this->serieManual($id);
        $this->exigirEntregaModificable((int) $acervo->dependencia_id);
        $acervo->update(Arr::only($datos, ['serie_documental', 'anio', 'folios', 'unidad_conservacion', 'ubicacion']));

        return $acervo->fresh(['dependencia', 'registradoPor']);
    }

    /**
     * Elimina una serie física.
     */
    public function eliminar(int $id): bool
    {
        $acervo = $this->serieManual($id);
        $this->exigirEntregaModificable((int) $acervo->dependencia_id);

        return (bool) $acervo->delete();
    }

    /**
     * Las series digitales (Anexo 03-B) reflejan el SGD y solo cambian al reingerirlo.
     */
    private function serieManual(int $id): AcervoDocumental
    {
        $acervo = AcervoDocumental::findOrFail($id);

        if ($acervo->esImportado()) {
            throw new HttpResponseException(
                ApiResponse::error('Las series del SGD se actualizan desde el SGD y no pueden modificarse.', 422)
            );
        }

        return $acervo;
    }

    private function resolverProcesoActivoId(): int
    {
        return (int) (ProcesoTransferencia::where('estado', 'abierto')->value('id') ?? 1);
    }
}

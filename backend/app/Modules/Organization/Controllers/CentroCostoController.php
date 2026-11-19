<?php

declare(strict_types=1);

namespace App\Modules\Organization\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Organization\Models\EquivalenciaCentroCosto;
use App\Modules\Organization\Services\EquivalenciasCentroCosto;
use App\Support\Http\ApiResponse;
use App\Support\Services\ContextoTransferencia;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Administración del catálogo del Anexo 01 y de la tabla de equivalencias
 * SGD/SIGA → centro de costo (D-11). Exige parametros.gestionar.
 */
class CentroCostoController extends Controller
{
    public function __construct(
        protected EquivalenciasCentroCosto $equivalencias,
        protected ContextoTransferencia $contexto,
    ) {}

    /** Los 64 CC del Anexo 01 con su padre y cuántas unidades de origen reúnen. */
    public function index(): JsonResponse
    {
        $centros = Dependencia::query()->centrosCosto()
            ->where('proceso_transferencia_id', $this->contexto->procesoActivoId())
            ->with('padre:id,codigo')
            ->withCount('equivalencias')
            ->get(['id', 'parent_id', 'codigo', 'nombre', 'nivel', 'activa'])
            ->sortBy('codigo', SORT_NATURAL)
            ->values()
            ->map(fn (Dependencia $centro): array => [
                'id' => $centro->id,
                'codigo' => $centro->codigo,
                'nombre' => $centro->nombre,
                'nivel' => $centro->nivel,
                'codigo_padre' => $centro->padre?->codigo,
                'envia_a_etts' => $centro->enviaAEtts(),
                'equivalencias' => $centro->equivalencias_count,
            ]);

        return ApiResponse::success($centros, 'Centros de costo del Anexo 01.');
    }

    public function equivalencias(Request $request): JsonResponse
    {
        $filtros = $request->validate([
            'origen' => ['nullable', Rule::in([EquivalenciaCentroCosto::ORIGEN_SGD, EquivalenciaCentroCosto::ORIGEN_SIGA])],
            'sin_asignar' => ['nullable', 'boolean'],
            'buscar' => ['nullable', 'string', 'max:100'],
        ]);

        $filas = EquivalenciaCentroCosto::query()
            ->with([
                'centroCosto:id,codigo,nombre',
                'dependenciaOrigen:id,parent_id',
                'dependenciaOrigen.padre:id,codigo,nombre',
                'confirmadaPor:id,name',
            ])
            ->where('proceso_transferencia_id', $this->contexto->procesoActivoId())
            ->when($filtros['origen'] ?? null, fn ($query, $origen) => $query->where('origen', $origen))
            ->when($request->boolean('sin_asignar'), fn ($query) => $query->whereNull('centro_costo_id'))
            ->when(trim($filtros['buscar'] ?? '') !== '', function ($query) use ($filtros): void {
                $buscar = '%'.trim($filtros['buscar']).'%';
                $query->where(fn ($query) => $query->whereLike('nombre_origen', $buscar)->orWhereLike('codigo_origen', $buscar));
            })
            ->orderBy('origen')
            ->orderBy('codigo_origen')
            ->get()
            ->map(fn (EquivalenciaCentroCosto $fila): array => $this->presentar($fila));

        return ApiResponse::success($filas, 'Equivalencias de centros de costo.');
    }

    public function actualizar(Request $request, int $id): JsonResponse
    {
        $datos = $request->validate([
            'centro_costo_id' => ['present', 'nullable', 'integer'],
            'es_principal' => ['sometimes', 'boolean'],
        ]);

        $equivalencia = EquivalenciaCentroCosto::query()
            ->where('proceso_transferencia_id', $this->contexto->procesoActivoId())
            ->findOrFail($id);

        $equivalencia = $this->equivalencias->asignar(
            $equivalencia,
            isset($datos['centro_costo_id']) ? (int) $datos['centro_costo_id'] : null,
            (bool) ($datos['es_principal'] ?? false),
            $request->user(),
        );

        return ApiResponse::success(
            $this->presentar($equivalencia->load(['centroCosto:id,codigo,nombre', 'dependenciaOrigen.padre:id,codigo,nombre', 'confirmadaPor:id,name'])),
            'Equivalencia actualizada. Ejecute la reasignación para trasladar los registros existentes.',
        );
    }

    /** @return array<string, mixed> */
    private function presentar(EquivalenciaCentroCosto $fila): array
    {
        $padre = $fila->dependenciaOrigen?->padre;

        return [
            'id' => $fila->id,
            'origen' => $fila->origen,
            'codigo_origen' => $fila->codigo_origen,
            'nombre_origen' => $fila->nombre_origen,
            'depende_de' => $padre ? "{$padre->codigo} {$padre->nombre}" : null,
            'centro_costo' => $fila->centroCosto?->only(['id', 'codigo', 'nombre']),
            'es_principal' => $fila->es_principal,
            'confirmada_por' => $fila->confirmadaPor?->name,
            'confirmada_en' => $fila->confirmada_en?->toIso8601String(),
        ];
    }
}

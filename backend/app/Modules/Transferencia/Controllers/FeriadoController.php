<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Transferencia\Models\Feriado;
use App\Modules\Transferencia\Services\FeriadoService;
use App\Support\Enums\AlcanceFeriado;
use App\Support\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Feriados y días no laborables del cronograma (RF-22). La consulta acompaña
 * al cronograma; el alta, la edición y la baja exigen cronograma.gestionar.
 */
class FeriadoController extends Controller
{
    public function __construct(private readonly FeriadoService $feriados) {}

    public function index(Request $request): JsonResponse
    {
        $anio = $request->validate(['anio' => ['nullable', 'integer', 'min:2000', 'max:2100']])['anio'] ?? null;

        return ApiResponse::success($this->feriados->listar($anio), 'Feriados recuperados.');
    }

    public function store(Request $request): JsonResponse
    {
        $feriado = $this->feriados->crear($this->validar($request));

        return ApiResponse::success($feriado, 'Feriado registrado. Se recalcularon los plazos CGR.', 201);
    }

    public function update(Request $request, Feriado $feriado): JsonResponse
    {
        $feriado = $this->feriados->actualizar($feriado, $this->validar($request, $feriado));

        return ApiResponse::success($feriado, 'Feriado actualizado. Se recalcularon los plazos CGR.');
    }

    public function destroy(Feriado $feriado): JsonResponse
    {
        $this->feriados->eliminar($feriado);

        return ApiResponse::success(null, 'Feriado eliminado. Se recalcularon los plazos CGR.');
    }

    /** @return array<string, mixed> */
    private function validar(Request $request, ?Feriado $feriado = null): array
    {
        return $request->validate([
            'fecha' => ['required', 'date', Rule::unique('feriados', 'fecha')->ignore($feriado?->id)],
            'descripcion' => ['required', 'string', 'max:200'],
            'alcance' => ['required', Rule::enum(AlcanceFeriado::class)],
        ], [
            'fecha.unique' => 'Ya hay un feriado registrado en esa fecha.',
        ]);
    }
}

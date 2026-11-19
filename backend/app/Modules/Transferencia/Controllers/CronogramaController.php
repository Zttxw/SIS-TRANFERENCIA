<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Transferencia\Services\CronogramaService;
use App\Support\Enums\EstadoActividadCronograma;
use App\Support\Enums\OperacionCronograma;
use App\Support\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Cronograma del proceso de transferencia (RF-20, RF-21). La consulta exige
 * anexos.ver; la modificación exige cronograma.gestionar (administrador y ETTS).
 * Los cambios quedan auditados por el trait Auditable del modelo.
 */
class CronogramaController extends Controller
{
    public function __construct(
        protected CronogramaService $cronograma,
    ) {}

    public function index(): JsonResponse
    {
        return ApiResponse::success(
            $this->cronograma->listar(),
            'Cronograma recuperado.',
        );
    }

    public function store(Request $request): JsonResponse
    {
        $datos = $this->validar($request);

        $actividad = $this->cronograma->crear($datos);

        return ApiResponse::success($actividad, 'Actividad del cronograma creada.', 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $datos = $this->validar($request, parcial: true);

        $actividad = $this->cronograma->actualizar($id, $datos);

        return ApiResponse::success($actividad, 'Actividad del cronograma actualizada.');
    }

    public function destroy(int $id): JsonResponse
    {
        $this->cronograma->eliminar($id);

        return ApiResponse::success(null, 'Actividad del cronograma eliminada.');
    }

    /**
     * @return array<string, mixed>
     */
    private function validar(Request $request, bool $parcial = false): array
    {
        $requerido = $parcial ? 'sometimes' : 'required';

        return $request->validate([
            'dependencia_id' => ['nullable', 'integer', 'exists:dependencias,id,es_centro_costo,1'],
            'etapa' => ['nullable', 'string', 'max:120'],
            'nombre' => [$requerido, 'string', 'max:200'],
            'descripcion' => ['nullable', 'string', 'max:1000'],
            'fecha_inicio' => ['nullable', 'date'],
            // Con plazo CGR, el vencimiento se calcula en días hábiles (RN-03) y
            // la fecha manual se ignora.
            'fecha_cgr' => ['nullable', 'date', 'after_or_equal:fecha_inicio'],
            'dias_habiles_antes' => ['sometimes', 'integer', 'min:0', 'max:30'],
            'fecha_vencimiento' => ['nullable', 'date', 'after_or_equal:fecha_inicio'],
            'hora_vencimiento' => ['nullable', 'date_format:H:i,H:i:s'],
            'estado' => ['nullable', Rule::enum(EstadoActividadCronograma::class)],
            'operacion' => ['sometimes', Rule::enum(OperacionCronograma::class)],
            'orden' => ['nullable', 'integer', 'min:0'],
        ]);
    }
}

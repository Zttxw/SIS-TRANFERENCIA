<?php

declare(strict_types=1);

namespace App\Modules\Auth\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Auth\Excel\DelegadosPlantillaExport;
use App\Modules\Auth\Services\CoordinadoresEttePdf;
use App\Modules\Auth\Services\DelegadoService;
use App\Modules\Auth\Services\GestionUsuariosService;
use App\Modules\Auth\Services\ImportacionDelegadosService;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\Rol;
use App\Support\Http\ApiResponse;
use App\Support\Services\PdfService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Gestión de coordinadores ETTE por el comité (RF-13, RF-15, D-10). Todas las
 * acciones, salvo `misCoordinadores`, exigen delegados.gestionar: alta por web
 * o Excel, reemplazo y revocación limitadas al equipo ETTE, sin facultad de
 * administrar roles o cuentas institucionales.
 */
class DelegadoController extends Controller
{
    public function __construct(
        protected DelegadoService $delegados,
    ) {}

    public function index(): JsonResponse
    {
        return ApiResponse::success($this->delegados->listar(), 'Coordinadores ETTE recuperados.');
    }

    public function historial(): JsonResponse
    {
        return ApiResponse::success($this->delegados->historial(), 'Historial de coordinadores ETTE recuperado.');
    }

    public function candidatos(Request $request): JsonResponse
    {
        $datos = $request->validate(['buscar' => ['nullable', 'string', 'max:100']]);
        $buscar = trim($datos['buscar'] ?? '');
        $usuarios = User::query()->where('activo', true)
            ->when($buscar !== '', function ($query) use ($buscar): void {
                $query->where(function ($query) use ($buscar): void {
                    $query->whereLike('name', '%'.$buscar.'%')->orWhereLike('dni', '%'.$buscar.'%');
                });
            })
            ->orderBy('name')->limit(30)->get(['id', 'dni', 'name']);

        return ApiResponse::success($usuarios, 'Cuentas disponibles para designación.');
    }

    public function store(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'dependencia_id' => ['required', 'integer', 'exists:dependencias,id,es_centro_costo,1'],
            'observacion' => ['nullable', 'string', 'max:500'],
        ]);

        $asignacion = $this->delegados->designar(
            userId: (int) $datos['user_id'],
            dependenciaId: (int) $datos['dependencia_id'],
            acreditador: $request->user(),
            observacion: $datos['observacion'] ?? null,
        );

        return ApiResponse::success(
            $asignacion->load(['usuario:id,dni,name', 'dependencia:id,codigo,nombre']),
            'Coordinador ETTE acreditado para el centro de costo.',
            201,
        );
    }

    public function crearExterno(Request $request, GestionUsuariosService $usuarios): JsonResponse
    {
        $datos = $request->validate([
            ...$this->reglasCuentaExterna(),
            'dependencia_id' => ['required', 'integer', 'exists:dependencias,id,es_centro_costo,1'],
            'observacion' => ['nullable', 'string', 'max:500'],
        ]);

        $asignacion = DB::transaction(function () use ($usuarios, $datos, $request) {
            $cuenta = $usuarios->crearExterno($datos);

            return $this->delegados->designar($cuenta->id, (int) $datos['dependencia_id'], $request->user(), $datos['observacion'] ?? null);
        });

        return ApiResponse::success(
            $asignacion->load(['usuario:id,dni,name', 'dependencia:id,codigo,nombre']),
            'Cuenta externa creada y acreditada como coordinador ETTE.',
            201,
        );
    }

    /**
     * Reemplaza al coordinador de una designación por una cuenta existente
     * (`user_id`) o por una cuenta externa nueva (`nuevo`).
     */
    public function reemplazar(Request $request, int $id, GestionUsuariosService $usuarios): JsonResponse
    {
        $datos = $request->validate([
            'motivo' => ['required', 'string', 'min:5', 'max:500'],
            'user_id' => ['required_without:nuevo', 'nullable', 'integer', 'exists:users,id'],
            'nuevo' => ['required_without:user_id', 'nullable', 'array'],
            ...collect($this->reglasCuentaExterna())->mapWithKeys(fn (array $reglas, string $campo): array => [
                "nuevo.{$campo}" => in_array('required', $reglas, true)
                    ? ['required_with:nuevo', ...array_values(array_diff($reglas, ['required']))]
                    : $reglas,
            ])->all(),
        ]);

        $asignacion = DB::transaction(function () use ($datos, $id, $request, $usuarios) {
            $userId = isset($datos['user_id'])
                ? (int) $datos['user_id']
                : $usuarios->crearExterno($datos['nuevo'])->id;

            return $this->delegados->reemplazar($id, $userId, $datos['motivo'], $request->user());
        });

        return ApiResponse::success($asignacion, 'Coordinador ETTE reemplazado. Se generó la constancia del reemplazo.', 201);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $revocado = $this->delegados->revocar($id, $request->user());

        if (! $revocado) {
            return ApiResponse::error('La designación de coordinador no existe.', 404);
        }

        return ApiResponse::success(null, 'Designación de coordinador revocada.');
    }

    public function plantilla(): BinaryFileResponse
    {
        $procesoId = (int) (ProcesoTransferencia::where('estado', 'abierto')->value('id') ?? 1);
        $centros = Dependencia::query()->centrosCosto()->with('padre:id,codigo')
            ->where('proceso_transferencia_id', $procesoId)->where('activa', true)
            ->get(['id', 'parent_id', 'codigo', 'nombre', 'nivel'])
            ->sortBy('codigo', SORT_NATURAL)->values()
            ->map(fn (Dependencia $d): array => [
                'codigo' => $d->codigo,
                'nombre' => $d->nombre,
                'nivel' => $d->nivel,
                'padre' => $d->padre?->codigo ?? $d->codigo,
            ])->all();

        return Excel::download(new DelegadosPlantillaExport($centros), 'plantilla-coordinadores-ette.xlsx');
    }

    /**
     * Carga por Excel: `modo=previsualizar` (por defecto) solo informa el
     * resultado por fila; `modo=confirmar` aplica las filas válidas.
     */
    public function importar(Request $request, ImportacionDelegadosService $importacion): JsonResponse
    {
        $datos = $request->validate([
            'archivo' => ['required', 'file', 'mimes:xlsx,xls', 'max:5120'],
            'modo' => ['nullable', 'in:previsualizar,confirmar'],
        ]);
        $filas = $importacion->leer($request->file('archivo'));

        if (($datos['modo'] ?? 'previsualizar') === 'confirmar') {
            $resultado = $importacion->confirmar($filas, $request->user());

            return ApiResponse::success($resultado, 'Importación aplicada.');
        }

        $resultados = $importacion->analizar($filas);

        return ApiResponse::success(
            ['resultados' => $resultados, 'resumen' => $importacion->resumen($resultados)],
            'Previsualización de la importación.',
        );
    }

    public function relacionPdf(PdfService $pdf, CoordinadoresEttePdf $vistas): StreamedResponse
    {
        return $pdf->descargar(
            'pdf.coordinadores-relacion',
            $vistas->relacion(),
            'relacion-coordinadores-ette-'.Carbon::now()->format('Ymd-His').'.pdf',
            'a4',
            'landscape',
        );
    }

    public function constanciaReemplazoPdf(int $id, PdfService $pdf, CoordinadoresEttePdf $vistas): StreamedResponse
    {
        $asignacion = $this->delegados->designacionDeReemplazo($id);
        abort_if($asignacion === null, 404, 'La designación no proviene de un reemplazo.');

        return $pdf->descargar(
            'pdf.coordinador-constancia-reemplazo',
            $vistas->constancia($asignacion),
            "constancia-reemplazo-coordinador-{$asignacion->id}.pdf",
        );
    }

    /**
     * Coordinadores ETTE de los CC de los que el usuario es responsable, con los
     * reemplazos recientes (aviso en el inicio, F-12).
     */
    public function misCoordinadores(Request $request): JsonResponse
    {
        $centros = $request->user()->asignacionesRol
            ->filter(fn ($a): bool => $a->rol === Rol::RESPONSABLE_CENTRO_COSTO && $a->dependencia_id !== null)
            ->pluck('dependencia_id')->unique()->values()->all();

        return ApiResponse::success($this->delegados->coordinadoresDe($centros), 'Coordinadores ETTE de sus centros de costo.');
    }

    /** @return array<string, list<string>> */
    private function reglasCuentaExterna(): array
    {
        return [
            'dni' => ['required', 'string', 'regex:/^[0-9]{8}$/'],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'celular' => ['nullable', 'string', 'regex:/^\+?[0-9 ]{6,20}$/'],
            'password' => ['required', 'string', 'min:8'],
        ];
    }
}

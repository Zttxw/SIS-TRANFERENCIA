<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Transferencia\Models\EnvioEtte;
use App\Modules\Transferencia\Services\CadenaEttsEtte;
use App\Modules\Transferencia\Services\ConstanciaEnvioEttePdf;
use App\Support\Http\ApiResponse;
use App\Support\Services\ContextoTransferencia;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Bandejas del ETTS y del ETTE (D-12): recepción en el ETTS, envío al ETTE por
 * lotes con constancia y recepción final en el ETTE.
 */
class CadenaEttsEtteController extends Controller
{
    public function __construct(
        private readonly CadenaEttsEtte $cadena,
        private readonly ContextoTransferencia $contexto,
    ) {}

    public function bandeja(): JsonResponse
    {
        return ApiResponse::success($this->cadena->bandeja(), 'Entregas dirigidas al ETTS recuperadas.');
    }

    public function recibirEtts(Request $request): JsonResponse
    {
        $entregas = $this->cadena->recibirEnEtts($this->dependencias($request), $request->user());

        return ApiResponse::success(['recibidas' => $entregas->count()], 'Recepción registrada en el ETTS.');
    }

    public function enviarEtte(Request $request): JsonResponse
    {
        $request->validate(['comentario' => ['nullable', 'string', 'max:1000']]);
        $envio = $this->cadena->enviarAlEtte($this->dependencias($request), $request->user(), $request->input('comentario'));

        return ApiResponse::success($this->resumenEnvio($envio), 'Entregas enviadas al ETTE en el lote '.$envio->codigo().'.', 201);
    }

    public function recibirEtte(Request $request): JsonResponse
    {
        $entregas = $this->cadena->recibirEnEtte($this->dependencias($request), $request->user());

        return ApiResponse::success(['recibidas' => $entregas->count()], 'Recepción registrada en el ETTE.');
    }

    /** Lotes enviados al ETTE en el proceso activo, del más reciente al más antiguo. */
    public function envios(): JsonResponse
    {
        $envios = EnvioEtte::with(['enviadoPor:id,name', 'entregas.dependencia:id,codigo,nombre'])
            ->where('proceso_transferencia_id', $this->contexto->procesoActivoId())
            ->orderByDesc('numero')->get()
            ->map(fn (EnvioEtte $envio): array => $this->resumenEnvio($envio));

        return ApiResponse::success($envios, 'Envíos al ETTE recuperados.');
    }

    public function constancia(int $id, ConstanciaEnvioEttePdf $constancia): StreamedResponse
    {
        $envio = EnvioEtte::where('proceso_transferencia_id', $this->contexto->procesoActivoId())->findOrFail($id);

        return $constancia->descargar($envio);
    }

    /** @return list<int> */
    private function dependencias(Request $request): array
    {
        $datos = $request->validate([
            'dependencia_ids' => ['required', 'array', 'min:1', 'max:100'],
            'dependencia_ids.*' => ['integer', 'distinct', 'exists:dependencias,id,es_centro_costo,1'],
        ]);

        return array_map('intval', $datos['dependencia_ids']);
    }

    /** @return array<string, mixed> */
    private function resumenEnvio(EnvioEtte $envio): array
    {
        $envio->loadMissing(['enviadoPor:id,name', 'entregas.dependencia:id,codigo,nombre']);

        return [
            'id' => $envio->id,
            'codigo' => $envio->codigo(),
            'enviado_en' => $envio->enviado_en->toIso8601String(),
            'enviado_por' => $envio->enviadoPor?->name,
            'comentario' => $envio->comentario,
            'centros' => $envio->entregas->map(fn ($entrega): array => [
                'id' => $entrega->dependencia_id,
                'codigo' => $entrega->dependencia->codigo,
                'nombre' => $entrega->dependencia->nombre,
                'estado' => $entrega->estado->value,
            ])->sortBy('codigo', SORT_NATURAL)->values()->all(),
        ];
    }
}

<?php

declare(strict_types=1);

namespace App\Support\Http;

use App\Http\Controllers\Controller;
use App\Modules\Acervo\Models\AcervoDocumental;
use App\Modules\Gestion\Models\InformeGestion;
use App\Modules\NoPatrimonial\Models\BienNoPatrimonial;
use App\Modules\Patrimonio\Models\BienPatrimonial;
use App\Modules\Transferencia\Models\ActaTransferencia;
use App\Modules\Transferencia\Models\Observacion;
use App\Support\Services\EvidenciaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class EvidenciaController extends Controller
{
    protected const MODELOS_PERMITIDOS = [
        'bien_patrimonial' => BienPatrimonial::class,
        'bien_no_patrimonial' => BienNoPatrimonial::class,
        'informe_gestion' => InformeGestion::class,
        'acervo_documental' => AcervoDocumental::class,
        'observacion' => Observacion::class,
        'acta' => ActaTransferencia::class,
    ];

    public function __construct(
        protected EvidenciaService $evidenciaService,
    ) {}

    /**
     * Sube un archivo al storage seguro de evidencias.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'archivo' => ['required', 'file', 'max:25600'], // máx 25 MB
            'tipo' => ['required', 'string', 'in:'.implode(',', array_keys(self::MODELOS_PERMITIDOS))],
            'id' => ['required', 'integer'],
            'descripcion' => ['nullable', 'string', 'max:255'],
        ]);

        $tipoClase = self::MODELOS_PERMITIDOS[$request->input('tipo')];
        $modeloId = (int) $request->input('id');

        $evidencia = $this->evidenciaService->subir(
            archivo: $request->file('archivo'),
            tipoModelo: $tipoClase,
            modeloId: $modeloId,
            usuario: $request->user(),
            descripcion: $request->input('descripcion')
        );

        return ApiResponse::success($evidencia, 'Evidencia subida y almacenada de forma segura.', 201);
    }

    /**
     * Descarga segura de un archivo de evidencia.
     */
    public function download(int $id): StreamedResponse
    {
        return $this->evidenciaService->descargar($id);
    }
}

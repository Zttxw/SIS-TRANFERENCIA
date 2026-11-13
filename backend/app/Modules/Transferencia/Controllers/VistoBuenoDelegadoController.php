<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\VistoBuenoDelegado;
use App\Support\Concerns\AutorizaAmbito;
use App\Support\Enums\Rol;
use App\Support\Http\ApiResponse;
use App\Support\Services\ContextoTransferencia;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Visto bueno del delegado ETTE sobre lo remitido por una dependencia asignada
 * (GAP 2 del portal del delegado). Es una constancia de conformidad acotada a su
 * ámbito: NO consolida ni cambia el estado de la entrega (eso es atribución de
 * responsable/ETTS vía entregas.revisar/consolidar). La ruta exige el permiso
 * delegado.visto_bueno; este controller además acota al ámbito y exige que el
 * usuario sea delegado ETTE de la dependencia y que la entrega esté remitida.
 */
class VistoBuenoDelegadoController extends Controller
{
    use AutorizaAmbito;

    public function __construct(private readonly ContextoTransferencia $contexto) {}

    /** Estado del visto bueno del delegado autenticado sobre una dependencia. */
    public function estado(Request $request, int $dependenciaId): JsonResponse
    {
        $this->autorizarDependencia($request->user(), $dependenciaId);
        $procesoId = $this->procesoDeLaDependencia($dependenciaId);

        $vb = VistoBuenoDelegado::where('proceso_transferencia_id', $procesoId)
            ->where('dependencia_id', $dependenciaId)
            ->where('delegado_id', $request->user()->id)
            ->first();

        return ApiResponse::success($this->serializar($vb, $dependenciaId, $procesoId));
    }

    /** Registra (o reactiva) el visto bueno del delegado sobre la dependencia. */
    public function store(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'dependencia_id' => ['required', 'integer', 'exists:dependencias,id'],
            'comentario' => ['nullable', 'string', 'max:1000'],
        ]);
        $dependenciaId = (int) $datos['dependencia_id'];
        $usuario = $request->user();
        $this->autorizarDependencia($usuario, $dependenciaId);
        $procesoId = $this->procesoDeLaDependencia($dependenciaId);
        $this->exigirDelegadoDeLaDependencia($usuario, $dependenciaId, $procesoId);
        $this->exigirEntregaRemitida($dependenciaId, $procesoId);

        // firstOrNew + restore permite reactivar un visto bueno retirado antes,
        // manteniendo la unicidad (proceso, dependencia, delegado).
        $vb = VistoBuenoDelegado::withTrashed()->firstOrNew([
            'proceso_transferencia_id' => $procesoId,
            'dependencia_id' => $dependenciaId,
            'delegado_id' => $usuario->id,
        ]);
        if ($vb->trashed()) {
            $vb->restore();
        }
        $vb->fill(['otorgado_en' => now(), 'comentario' => $datos['comentario'] ?? null])->save();

        return ApiResponse::success(
            $this->serializar($vb->fresh(), $dependenciaId, $procesoId),
            'Visto bueno del delegado registrado.',
            201,
        );
    }

    /** Retira el visto bueno del delegado autenticado sobre la dependencia. */
    public function destroy(Request $request, int $dependenciaId): JsonResponse
    {
        $this->autorizarDependencia($request->user(), $dependenciaId);
        $procesoId = $this->procesoDeLaDependencia($dependenciaId);

        VistoBuenoDelegado::where('proceso_transferencia_id', $procesoId)
            ->where('dependencia_id', $dependenciaId)
            ->where('delegado_id', $request->user()->id)
            ->get()->each->delete();

        return ApiResponse::success($this->serializar(null, $dependenciaId, $procesoId), 'Visto bueno del delegado retirado.');
    }

    private function procesoDeLaDependencia(int $dependenciaId): int
    {
        $procesoId = (int) Dependencia::whereKey($dependenciaId)->value('proceso_transferencia_id');
        abort_unless($procesoId === $this->contexto->procesoActivoId(), 409, 'La dependencia no pertenece al proceso activo.');

        return $procesoId;
    }

    /**
     * El visto bueno es atribución del delegado ETTE designado a esa dependencia,
     * no de cualquier cuenta con el permiso: defiende el caso de un ámbito más
     * amplio concedido por otra vía.
     */
    private function exigirDelegadoDeLaDependencia($usuario, int $dependenciaId, int $procesoId): void
    {
        $esDelegado = $usuario->asignacionesRol()
            ->where('rol', Rol::DELEGADO_ETTE->value)
            ->where('proceso_transferencia_id', $procesoId)
            ->where('dependencia_id', $dependenciaId)
            ->exists();
        abort_unless($esDelegado, 403, 'Solo el delegado designado a esta dependencia puede dar el visto bueno.');
    }

    private function exigirEntregaRemitida(int $dependenciaId, int $procesoId): void
    {
        $entrega = $this->contexto->entregaDe($dependenciaId, $procesoId);
        abort_if($entrega === null || ! in_array($entrega->estado->value, ['remitida', 'en_revision', 'consolidada'], true),
            409, 'Solo puede dar el visto bueno a una entrega ya remitida.');
    }

    /** @return array<string, mixed> */
    private function serializar(?VistoBuenoDelegado $vb, int $dependenciaId, int $procesoId): array
    {
        return [
            'dependencia_id' => $dependenciaId,
            'aprobado' => $vb !== null,
            'otorgado_en' => $vb?->otorgado_en?->toIso8601String(),
            'comentario' => $vb?->comentario,
        ];
    }
}

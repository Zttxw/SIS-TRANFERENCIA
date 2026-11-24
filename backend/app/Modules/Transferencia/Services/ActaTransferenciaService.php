<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Services;

use App\Models\User;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\ActaTransferencia;
use App\Modules\Transferencia\Models\FirmaAnexo;
use App\Support\Enums\EstadoEntrega;
use App\Support\Services\ContextoTransferencia;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Emisión y datos del Acta 07 de un centro de costo (fase 8, RF-60 a RF-66).
 *
 * Mientras el acta sea editable (entrega sin remitir ni suscribir y sin firmas
 * sobre la versión vigente), sus datos derivados —intervinientes y condición
 * por defecto de cada anexo— se recalculan; después quedan fijos, para que el
 * PDF firmado no cambie (p. ej. si luego se reemplaza al coordinador).
 */
class ActaTransferenciaService
{
    public const LUGAR_POR_DEFECTO = 'San Jerónimo, Cusco';

    public function __construct(
        private readonly TransferenciaService $transferencia,
        private readonly IntervinientesActa $intervinientes,
        private readonly CondicionesActa $condiciones,
        private readonly ObservacionesActa $observaciones,
        private readonly ContextoTransferencia $contexto,
    ) {}

    /** Materializa el acta del CC (la emite si no existe) y la devuelve al día. */
    public function obtener(int $dependenciaId, ?User $usuario = null): ActaTransferencia
    {
        $dependencia = Dependencia::with('padre')->findOrFail($dependenciaId);
        $procesoId = $this->contexto->procesoActivoId();
        $acta = ActaTransferencia::firstOrNew(['proceso_transferencia_id' => $procesoId, 'dependencia_id' => $dependencia->id]);

        if (! $acta->exists || $this->editable($acta)) {
            $this->recalcular($acta, $dependencia, $procesoId);
        }

        $acta->fill([
            'numero_acta' => $acta->numero_acta ?? 'ACTA-'.Carbon::now()->year.'-'.str_replace('.', '', (string) $dependencia->codigo),
            'fecha_acta' => $acta->fecha_acta ?? Carbon::now()->toDateString(),
            'lugar' => $acta->lugar ?? self::LUGAR_POR_DEFECTO,
            'estado' => $acta->estado === 'suscrita' ? 'suscrita' : 'generada',
            'version' => $acta->version ?? 1,
            'generada_por_id' => $acta->generada_por_id ?? $usuario?->id,
        ]);
        $acta->save();

        return $acta->refresh()->load(['evidencias.subidoPor', 'generadaPor', 'dependencia.padre:id,codigo,nombre']);
    }

    /**
     * Las partes completan el acta antes de firmarla: fecha, hora y lugar,
     * condición y observación de cada documento, otros documentos y
     * comentarios adicionales (RF-62, RF-63, RF-66).
     *
     * @param  array<string, mixed>  $datos
     */
    public function actualizar(int $dependenciaId, array $datos, User $usuario): ActaTransferencia
    {
        return DB::transaction(function () use ($dependenciaId, $datos, $usuario): ActaTransferencia {
            Dependencia::whereKey($dependenciaId)->lockForUpdate()->firstOrFail();
            $acta = $this->obtener($dependenciaId, $usuario);
            abort_unless($this->editable($acta), 409,
                'El acta ya no se modifica: tiene firmas sobre su versión vigente o la entrega ya fue suscrita o remitida.');

            $acta->fill(array_intersect_key($datos, array_flip(['fecha_acta', 'lugar', 'hora', 'otros_documentos', 'observaciones'])));
            $vigentes = $this->condiciones->componer(
                $acta->anexos_entregados ?? [],
                $this->transferencia->presenciaAnexos($dependenciaId, $acta->proceso_transferencia_id),
                $acta->otros_documentos,
            );
            $acta->anexos_entregados = $this->condiciones->fijar($vigentes, $datos['condiciones'] ?? []);
            $acta->save();

            return $acta->refresh()->load(['evidencias.subidoPor', 'generadaPor', 'dependencia.padre:id,codigo,nombre']);
        });
    }

    /**
     * Se edita (y se recalcula) mientras la entrega siga en preparación o en
     * revisión y nadie haya firmado la versión vigente del acta.
     */
    public function editable(ActaTransferencia $acta): bool
    {
        $estado = $this->contexto->entregaDe($acta->dependencia_id, $acta->proceso_transferencia_id)?->estado ?? EstadoEntrega::BORRADOR;
        if (! in_array($estado, [EstadoEntrega::BORRADOR, EstadoEntrega::EN_REVISION], true)) {
            return false;
        }

        return ! $acta->exists || ! FirmaAnexo::query()->validas()
            ->where('firmable_type', $acta->getMorphClass())
            ->where('firmable_id', $acta->id)
            ->where('version', $acta->version)
            ->exists();
    }

    /**
     * Acta para la API: sus datos, si aún se edita y las observaciones del
     * coordinador que figuran en la sección IV.
     *
     * @return array<string, mixed>
     */
    public function paraConsulta(ActaTransferencia $acta): array
    {
        return [
            ...$acta->toArray(),
            'editable' => $this->editable($acta),
            'observaciones_registradas' => $this->observaciones->delCentro($acta->dependencia_id, $acta->proceso_transferencia_id),
        ];
    }

    private function recalcular(ActaTransferencia $acta, Dependencia $dependencia, int $procesoId): void
    {
        $guardados = $acta->intervinientes ?? [];
        $acta->intervinientes = [
            'titular_saliente' => $this->conCorreccionesManuales($guardados['titular_saliente'] ?? null, $this->intervinientes->entrega($dependencia)),
            'coordinador_ette' => $this->intervinientes->recepcion($dependencia),
        ];
        $acta->anexos_entregados = $this->condiciones->componer(
            $acta->anexos_entregados ?? [],
            $this->transferencia->presenciaAnexos($dependencia->id, $procesoId),
            $acta->otros_documentos,
        );
    }

    /**
     * Los datos del responsable corregidos a mano en el acta prevalecen sobre
     * los del padrón.
     *
     * @param  array{nombre: string, dni: string, cargo: string}  $automatico
     * @return array{nombre: string, dni: string, cargo: string}
     */
    private function conCorreccionesManuales(mixed $existente, array $automatico): array
    {
        if (is_string($existente)) {
            $existente = ['nombre' => $existente];
        }
        foreach (['nombre', 'dni', 'cargo'] as $campo) {
            if (is_array($existente) && trim((string) ($existente[$campo] ?? '')) !== '') {
                $automatico[$campo] = (string) $existente[$campo];
            }
        }

        return $automatico;
    }
}

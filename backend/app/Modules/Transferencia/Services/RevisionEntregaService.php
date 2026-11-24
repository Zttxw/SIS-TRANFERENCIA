<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Services;

use App\Models\User;
use App\Modules\Auth\Services\CoordinacionEtte;
use App\Modules\Gestion\Services\CongelamientoAgendaPendiente;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\Entrega;
use App\Support\Enums\AccionPlazo;
use App\Support\Enums\EstadoEntrega;
use App\Support\Http\ApiResponse;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Revisión presencial del coordinador ETTE (D-07, decisión del 2026-11-24).
 *
 * La transferencia no es una auditoría: el responsable del CC cierra la entrega
 * y la pasa a firma (`en_revision`, edición bloqueada). En su sesión, el
 * coordinador ETTE asignado —o un titular ETTE que lo suple, designado con
 * motivo— revisa, deja observaciones como constancia y firma con su
 * certificado: firmar es aprobar. No hay devolución ni subsanación. El CC padre
 * no interviene: solo consolida (D-08). Cerrar se bloquea al vencer el plazo de
 * la actividad 3 (D-12).
 */
class RevisionEntregaService
{
    public function __construct(
        private readonly CoordinacionEtte $coordinacion,
        private readonly FirmantesDocumento $firmantes,
        private readonly SuscripcionEntrega $suscripcion,
        private readonly CongelamientoAgendaPendiente $agendaPendiente,
        private readonly CronogramaService $cronograma,
    ) {}

    /**
     * El responsable cierra la entrega y la pasa a firma: de borrador a
     * en_revision. Congela los documentos pendientes del Anexo 02 (D-09) para
     * que el documento no cambie durante la revisión y la firma.
     */
    public function presentar(int $dependenciaId, User $usuario): Entrega
    {
        return DB::transaction(function () use ($dependenciaId, $usuario): Entrega {
            $dependencia = $this->centroCosto($dependenciaId);
            $this->cronograma->exigirPlazoVigente($dependencia->proceso_transferencia_id, $dependencia->id, AccionPlazo::PRESENTAR);
            $entrega = Entrega::firstOrNew([
                'proceso_transferencia_id' => $dependencia->proceso_transferencia_id,
                'dependencia_id' => $dependencia->id,
            ]);
            $estado = $entrega->estado ?? EstadoEntrega::BORRADOR;

            if ($estado !== EstadoEntrega::BORRADOR) {
                $this->conflicto('La entrega ya se cerró para revisión y firma (estado "'.$estado->etiqueta().'").');
            }

            $this->agendaPendiente->congelar($dependencia);

            $entrega->fill([
                'dependencia_destino_id' => $dependencia->parent_id,
                'estado' => EstadoEntrega::EN_REVISION,
                'presentada_en' => Carbon::now(),
                'presentada_por_id' => $usuario->id,
            ])->save();

            return $entrega->fresh(['presentadaPor', 'titularSuplente']);
        });
    }

    /**
     * El responsable designa al titular ETTE que suple al coordinador ausente
     * (con motivo), o retira la designación (`$titularId` null) para que actúe el
     * coordinador vigente. Solo mientras nadie haya firmado por el lado ETTE ni
     * el acta: el firmante ETTE figura en la sección II del Acta 07.
     */
    public function designarSuplencia(int $dependenciaId, User $operador, ?int $titularId, ?string $motivo): Entrega
    {
        $this->firmantes->exigirOperador($operador, $dependenciaId);

        return DB::transaction(function () use ($dependenciaId, $operador, $titularId, $motivo): Entrega {
            $dependencia = $this->centroCosto($dependenciaId);
            $entrega = $this->exigirEnRevision($dependencia);

            if ($titularId !== null) {
                $titular = $this->coordinacion->titulares($dependencia->proceso_transferencia_id)->firstWhere('id', $titularId);
                if ($titular === null) {
                    throw ValidationException::withMessages(['titular_id' => 'Seleccione un titular ETTE activo del proceso.']);
                }
                if (trim((string) $motivo) === '') {
                    throw ValidationException::withMessages(['motivo_suplencia' => 'Indique el motivo de la suplencia (ausencia del coordinador).']);
                }
            }

            $documentos = $this->suscripcion->requisitosRemision($dependencia->id, $operador)['documentos'];
            $firmadoPorEtte = collect($documentos)->contains(fn (array $documento): bool => $documento['ette'] !== null);
            if ($firmadoPorEtte || $documentos['anexo07']['entidad'] !== null) {
                $this->conflicto('Ya hay firmas vigentes del lado ETTE o del acta: el firmante ETTE ya no puede cambiar.');
            }

            $entrega->fill([
                'titular_suplente_id' => $titularId,
                'motivo_suplencia_ette' => $titularId !== null ? trim((string) $motivo) : null,
            ])->save();

            return $entrega->fresh(['presentadaPor', 'titularSuplente']);
        });
    }

    /**
     * Exige que la entrega del CC esté cerrada para revisión y aún sin suscribir:
     * es el momento en que se registran o retiran las observaciones del
     * coordinador y se designa la suplencia.
     */
    public function exigirEnRevision(Dependencia $dependencia): Entrega
    {
        $entrega = Entrega::where('proceso_transferencia_id', $dependencia->proceso_transferencia_id)
            ->where('dependencia_id', $dependencia->id)->lockForUpdate()->first();

        if ($entrega?->estado !== EstadoEntrega::EN_REVISION) {
            $this->conflicto($entrega === null || $entrega->estado === EstadoEntrega::BORRADOR
                ? 'El responsable aún no cierra la entrega para revisión y firma.'
                : 'La entrega ya no está en revisión (estado "'.$entrega->estado->etiqueta().'").');
        }

        return $entrega;
    }

    /**
     * Las observaciones figuran en la sección IV del Acta 07: una vez que alguien
     * firmó la versión vigente del acta, ya no se agregan ni se retiran.
     */
    public function exigirActaSinFirmas(Dependencia $dependencia, User $usuario): void
    {
        $acta = $this->suscripcion->requisitosRemision($dependencia->id, $usuario)['documentos']['anexo07'];
        if ($acta['entidad'] !== null || $acta['ette'] !== null) {
            $this->conflicto('El acta ya tiene firmas: las observaciones del coordinador quedaron fijadas en ella.');
        }
    }

    private function centroCosto(int $dependenciaId): Dependencia
    {
        $dependencia = Dependencia::whereKey($dependenciaId)->lockForUpdate()->firstOrFail();
        if (! $dependencia->es_centro_costo) {
            throw new HttpResponseException(ApiResponse::error('Solo los centros de costo del Anexo 01 tienen entrega.', 422));
        }

        return $dependencia;
    }

    private function conflicto(string $mensaje): never
    {
        throw new HttpResponseException(ApiResponse::error($mensaje, 409));
    }
}

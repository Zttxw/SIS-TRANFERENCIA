<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Services;

use App\Models\User;
use App\Modules\Auth\Services\CoordinacionEtte;
use App\Modules\Gestion\Services\CongelamientoAgendaPendiente;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\Entrega;
use App\Support\Enums\AccionPlazo;
use App\Support\Enums\CalidadEtte;
use App\Support\Enums\EstadoEntrega;
use App\Support\Http\ApiResponse;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Aceptación del coordinador ETTE antes de firmar (D-07, plan §3.1 y fase 3).
 *
 * La transferencia no es una auditoría: el responsable del CC presenta sus
 * anexos (`en_revision`, edición bloqueada) y el coordinador ETTE asignado —o un
 * titular ETTE en suplencia, con motivo— acepta lo entregado (`verificada`),
 * dejando, si corresponde, observaciones como constancia. No hay devolución ni
 * subsanación. El CC padre no interviene: solo consolida (D-08). Presentar y
 * aceptar se bloquean al vencer el plazo de la actividad 3 (D-12).
 */
class RevisionEntregaService
{
    public function __construct(
        private readonly CoordinacionEtte $coordinacion,
        private readonly CongelamientoAgendaPendiente $agendaPendiente,
        private readonly CronogramaService $cronograma,
    ) {}

    /**
     * El responsable presenta la entrega al coordinador: de borrador a
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
                $this->conflicto('La entrega ya fue presentada al coordinador (estado "'.$estado->etiqueta().'").');
            }

            $this->agendaPendiente->congelar($dependencia);

            $entrega->fill([
                'dependencia_destino_id' => $dependencia->parent_id,
                'estado' => EstadoEntrega::EN_REVISION,
                'presentada_en' => Carbon::now(),
                'presentada_por_id' => $usuario->id,
            ])->save();

            return $entrega->fresh(['presentadaPor', 'verificadaPor']);
        });
    }

    /**
     * El lado ETTE acepta lo entregado: de en_revision a verificada. Deja
     * constancia de quién, en qué calidad y qué se revisó y qué no (RF-54,
     * RF-56). Las observaciones registradas no impiden aceptar (D-07).
     */
    public function verificar(int $dependenciaId, User $usuario, string $resultado, ?string $motivoSuplencia = null): Entrega
    {
        $calidad = $this->calidadEtte($usuario, $dependenciaId, $motivoSuplencia);

        return DB::transaction(function () use ($dependenciaId, $usuario, $resultado, $calidad): Entrega {
            $dependencia = $this->centroCosto($dependenciaId);
            $entrega = $this->exigirEnRevision($dependencia);
            $this->cronograma->exigirPlazoVigente($dependencia->proceso_transferencia_id, $dependencia->id, AccionPlazo::VERIFICAR);

            $entrega->fill([
                'estado' => EstadoEntrega::VERIFICADA,
                'verificada_en' => Carbon::now(),
                'verificada_por_id' => $usuario->id,
                'verificada_en_calidad_de' => $calidad['en_calidad_de'],
                'motivo_suplencia_verificacion' => $calidad['motivo_suplencia'],
                'resultado_verificacion' => $resultado,
            ])->save();

            return $entrega->fresh(['presentadaPor', 'verificadaPor']);
        });
    }

    /**
     * Exige que la entrega del CC esté presentada y aún sin aceptar: es el
     * único momento en que el coordinador registra o retira observaciones.
     */
    public function exigirEnRevision(Dependencia $dependencia): Entrega
    {
        $entrega = Entrega::where('proceso_transferencia_id', $dependencia->proceso_transferencia_id)
            ->where('dependencia_id', $dependencia->id)->lockForUpdate()->first();

        if ($entrega?->estado !== EstadoEntrega::EN_REVISION) {
            $this->conflicto($entrega === null || $entrega->estado === EstadoEntrega::BORRADOR
                ? 'El responsable del centro de costo aún no presenta la entrega al coordinador.'
                : 'El coordinador ya aceptó la entrega (estado "'.$entrega->estado->etiqueta().'").');
        }

        return $entrega;
    }

    /**
     * Calidad ETTE de quien acepta u observa: el coordinador asignado al CC o un
     * titular ETTE en suplencia con motivo.
     *
     * @return array{en_calidad_de: CalidadEtte, motivo_suplencia: ?string}
     */
    public function calidadEtte(User $usuario, int $dependenciaId, ?string $motivoSuplencia): array
    {
        $calidad = $this->coordinacion->calidad($usuario, $dependenciaId, $motivoSuplencia);
        if ($calidad === null) {
            throw new HttpResponseException(ApiResponse::error(
                'Solo el coordinador ETTE asignado al centro de costo, o un titular ETTE en su suplencia, revisa la entrega.',
                403,
            ));
        }

        return $calidad;
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

<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Services;

use App\Models\User;
use App\Modules\Auth\Services\CoordinacionEtte;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\ActaTransferencia;
use App\Modules\Transferencia\Models\FirmaAnexo;
use App\Modules\Transferencia\Models\FirmaSesion;
use App\Support\Enums\CalidadEtte;
use App\Support\Enums\LadoFirma;
use App\Support\Enums\Permiso;
use App\Support\Enums\Rol;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

/**
 * Quién suscribe cada documento 02–07 y por qué lado (D-04, D-05).
 *
 * Las firmas de un CC se operan siempre desde la sesión de su responsable:
 *
 * - Lado entidad: el propio responsable del centro de costo.
 * - Lado ETTE: el firmante designado (coordinador ETTE vigente o titular ETTE
 *   en suplencia), que firma presencialmente con su certificado. La sesión de
 *   firma se emite a su nombre y DNI, así que Firma Perú solo acepta su firma.
 *
 * El Anexo 01 es institucional (sin CC, `dependencia_id` NULL) y se firma al
 * cierre del proceso, cada uno con su cuenta: lado entidad el ETTS y lado ETTE
 * un titular ETTE.
 */
class FirmantesDocumento
{
    public function __construct(private readonly CoordinacionEtte $coordinacion) {}

    /**
     * Firmante, lado y calidad de una firma que el operador inicia. En un CC, el
     * operador debe ser su responsable y elige el lado; en el Anexo 01, firma su
     * propio lado.
     *
     * @return array{lado: LadoFirma, firmante: User, en_calidad_de: ?CalidadEtte, motivo_suplencia: ?string}
     */
    public function firmante(User $operador, string $tipo, ?int $dependenciaId, ?LadoFirma $lado = null): array
    {
        if ($tipo === 'anexo01' || $dependenciaId === null) {
            $institucional = $this->ladoInstitucional($operador, $tipo, $dependenciaId);
            abort_if($lado !== null && $lado !== $institucional['lado'], 403, 'Solo puede firmar su propio lado del Anexo 01.');

            return [...$institucional, 'firmante' => $operador];
        }
        abort_if($lado === null, 422, 'Indique el lado que firma: entidad o ETTE.');
        $this->exigirOperador($operador, $dependenciaId);

        if ($lado === LadoFirma::ENTIDAD) {
            abort_if($tipo === 'anexo07' && ! $operador->tienePermiso(Permiso::GenerarActas), 403, 'No tiene permiso para suscribir el acta.');

            return ['lado' => LadoFirma::ENTIDAD, 'firmante' => $operador, 'en_calidad_de' => null, 'motivo_suplencia' => null];
        }

        $ette = $this->coordinacion->firmanteDe($dependenciaId);
        abort_if($ette === null, 409, 'El centro de costo no tiene coordinador ETTE vigente ni un titular ETTE designado en suplencia.');
        abort_if($tipo === 'anexo07' && ! $this->actaEmitida($dependenciaId), 409,
            'Emita el acta antes de que firme el lado ETTE.');

        return ['lado' => LadoFirma::ETTE, 'firmante' => $ette['usuario'],
            'en_calidad_de' => $ette['en_calidad_de'], 'motivo_suplencia' => $ette['motivo_suplencia']];
    }

    /**
     * Solo el responsable del CC opera la revisión y la firma presencial con el
     * coordinador ETTE (no el responsable de un CC padre, D-08).
     */
    public function exigirOperador(User $usuario, int $dependenciaId): void
    {
        abort_unless($this->opera($usuario, $dependenciaId), 403,
            'Solo el responsable del centro de costo opera la revisión y la firma con el coordinador ETTE.');
    }

    public function opera(User $usuario, int $dependenciaId): bool
    {
        return $usuario->activo && $usuario->tieneRol(Rol::RESPONSABLE_CENTRO_COSTO, $dependenciaId);
    }

    /**
     * Lado por el que el usuario firmaría el Anexo 01 institucional, para que la
     * interfaz sepa qué ofrecer.
     *
     * @return array{lado: LadoFirma, en_calidad_de: ?CalidadEtte}|null
     */
    public function ladoInstitucionalPotencial(User $usuario): ?array
    {
        return match (true) {
            $usuario->tieneRol(Rol::ETTS) => ['lado' => LadoFirma::ENTIDAD, 'en_calidad_de' => null],
            $usuario->tieneRol(Rol::ETTE) => ['lado' => LadoFirma::ETTE, 'en_calidad_de' => CalidadEtte::TITULAR],
            default => null,
        };
    }

    /**
     * Al recibir la firma, confirma que el operador sigue habilitado y que el
     * firmante y su calidad son los mismos con que se preparó la sesión: detecta
     * revocaciones, reemplazos o cambios de suplencia entre la preparación y la
     * firma.
     */
    public function exigirFirmanteAsignado(FirmaSesion $sesion): void
    {
        $operador = User::findOrFail($sesion->operador_id ?? $sesion->usuario_id);
        try {
            $actual = $this->firmante($operador, $sesion->tipo_documento, $sesion->dependencia_id, $sesion->lado);
        } catch (HttpExceptionInterface|ValidationException) {
            throw ValidationException::withMessages(['signed_file' => [
                'El firmante ya no tiene una asignación de rol vigente que lo habilite a suscribir este documento.',
            ]]);
        }
        if ($actual['firmante']->id !== $sesion->usuario_id || $actual['en_calidad_de'] !== $sesion->en_calidad_de) {
            throw ValidationException::withMessages(['signed_file' => [
                'El firmante designado cambió entre la preparación y la firma del documento.',
            ]]);
        }
    }

    /**
     * ¿La firma registrada sigue contando para su lado? La del responsable exige
     * que siga siéndolo; la del lado ETTE se conserva aunque el coordinador sea
     * reemplazado después (RN-12).
     */
    public function firmaCuenta(FirmaAnexo $firma, ?int $dependenciaId): bool
    {
        $firmante = $firma->firmante;
        if (! $firmante?->activo) {
            return false;
        }
        if ($dependenciaId === null) {
            return $firma->lado === LadoFirma::ETTE || $firmante->tieneRol(Rol::ETTS);
        }

        return $firma->lado === LadoFirma::ETTE || $firmante->tieneRol(Rol::RESPONSABLE_CENTRO_COSTO, $dependenciaId);
    }

    /**
     * Genera los PDF el personal de la entidad: el ETTS, el servidor o el
     * responsable de su CC (o de un CC ancestro). El acta exige actas.generar.
     */
    public function exigirPuedeGenerar(User $usuario, string $tipo, int $dependenciaId): void
    {
        abort_unless($usuario->activo && $usuario->puedeAccederDependencia($dependenciaId), 403);
        $procesoId = Dependencia::whereKey($dependenciaId)->value('proceso_transferencia_id');
        $personal = $usuario->asignacionesRol()->with('dependencia')->where('proceso_transferencia_id', $procesoId)->get()
            ->contains(fn ($asignacion): bool => $asignacion->rol === Rol::ETTS
                || ($asignacion->rol === Rol::SERVIDOR && $asignacion->dependencia_id === $dependenciaId)
                || ($asignacion->rol === Rol::RESPONSABLE_CENTRO_COSTO
                    && in_array($dependenciaId, $asignacion->dependencia?->idsSubarbol() ?? [], true)));
        abort_unless($personal, 403);
        abort_if($tipo === 'anexo07' && ! $usuario->tienePermiso(Permiso::GenerarActas), 403, 'No tiene permiso para generar el acta.');
    }

    /** Consultan actas quienes las generan y el lado ETTE (coordinador o titular). */
    public function exigirConsultaDeActas(User $usuario): void
    {
        abort_unless($usuario->tienePermiso(Permiso::GenerarActas)
            || $usuario->tieneRol(Rol::DELEGADO_ETTE) || $usuario->tieneRol(Rol::ETTE), 403);
    }

    /** Consulta del acta: quien la genera o el lado ETTE del CC, una vez emitida. */
    public function exigirIntervieneEnActa(User $usuario, int $dependenciaId): void
    {
        if ($usuario->tienePermiso(Permiso::GenerarActas)) {
            $this->exigirPuedeGenerar($usuario, 'anexo07', $dependenciaId);

            return;
        }
        abort_unless($usuario->activo && $usuario->puedeAccederDependencia($dependenciaId)
            && $this->coordinacion->actuaPorEtte($usuario, $dependenciaId), 403);
        abort_unless($this->actaEmitida($dependenciaId), 409, 'El responsable aún no emite el acta.');
    }

    /**
     * Lado de quien firma el Anexo 01 institucional: el ETTS por la entidad y
     * un titular ETTE por el ETTE.
     *
     * @return array{lado: LadoFirma, en_calidad_de: ?CalidadEtte, motivo_suplencia: null}
     */
    private function ladoInstitucional(User $usuario, string $tipo, ?int $dependenciaId): array
    {
        abort_unless($tipo === 'anexo01' && $dependenciaId === null, 422,
            'El Anexo 01 se firma una sola vez, al cierre del proceso, como documento institucional.');
        $lado = $usuario->activo ? $this->ladoInstitucionalPotencial($usuario) : null;
        abort_if($lado === null, 403, 'El Anexo 01 lo firman el ETTS y un titular ETTE.');

        return [...$lado, 'motivo_suplencia' => null];
    }

    private function actaEmitida(int $dependenciaId): bool
    {
        return ActaTransferencia::where('dependencia_id', $dependenciaId)
            ->where('proceso_transferencia_id', Dependencia::whereKey($dependenciaId)->value('proceso_transferencia_id'))
            ->exists();
    }
}

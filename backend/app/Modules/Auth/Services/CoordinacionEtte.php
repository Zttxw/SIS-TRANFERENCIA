<?php

declare(strict_types=1);

namespace App\Modules\Auth\Services;

use App\Models\User;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Organization\Models\Dependencia;
use App\Support\Enums\CalidadEtte;
use App\Support\Enums\Rol;
use Illuminate\Validation\ValidationException;

/**
 * Determina en qué calidad actúa un usuario por el lado ETTE de un centro de
 * costo (D-04): el coordinador ETTE asignado a ese CC o un titular ETTE que lo
 * suple. La suplencia exige motivo (ausencia del coordinador) y queda
 * registrada junto a la acción (observación, verificación o firma).
 */
class CoordinacionEtte
{
    /**
     * @return array{en_calidad_de: CalidadEtte, motivo_suplencia: ?string}|null null si el usuario no actúa por el lado ETTE de ese CC.
     *
     * @throws ValidationException si actúa como titular suplente sin indicar el motivo.
     */
    public function calidad(User $usuario, int $dependenciaId, ?string $motivoSuplencia = null): ?array
    {
        if ($this->esCoordinadorDe($usuario, $dependenciaId)) {
            return ['en_calidad_de' => CalidadEtte::COORDINADOR, 'motivo_suplencia' => null];
        }

        if (! $usuario->tieneRol(Rol::ETTE)) {
            return null;
        }

        $motivo = trim((string) $motivoSuplencia);
        if ($motivo === '') {
            throw ValidationException::withMessages([
                'motivo_suplencia' => 'Como titular ETTE actúa en suplencia del coordinador: indique el motivo (ausencia del coordinador).',
            ]);
        }

        return ['en_calidad_de' => CalidadEtte::TITULAR_SUPLENTE, 'motivo_suplencia' => $motivo];
    }

    /** ¿Actúa por el lado ETTE del CC (coordinador asignado o titular ETTE)? */
    public function actuaPorEtte(User $usuario, int $dependenciaId): bool
    {
        return $this->esCoordinadorDe($usuario, $dependenciaId) || $usuario->tieneRol(Rol::ETTE);
    }

    public function esCoordinadorDe(User $usuario, int $dependenciaId): bool
    {
        $procesoId = Dependencia::whereKey($dependenciaId)->value('proceso_transferencia_id');

        return AsignacionRol::query()
            ->where('user_id', $usuario->id)
            ->where('rol', Rol::DELEGADO_ETTE->value)
            ->where('dependencia_id', $dependenciaId)
            ->where('proceso_transferencia_id', $procesoId)
            ->exists();
    }
}

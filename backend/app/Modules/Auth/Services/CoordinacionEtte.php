<?php

declare(strict_types=1);

namespace App\Modules\Auth\Services;

use App\Models\User;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\Entrega;
use App\Support\Enums\CalidadEtte;
use App\Support\Enums\Rol;
use Illuminate\Support\Collection;

/**
 * Quién actúa por el lado ETTE de un centro de costo (D-04).
 *
 * El coordinador ETTE asignado revisa y firma presencialmente en la sesión del
 * responsable del CC. Si está ausente, el responsable designa en la entrega a un
 * titular ETTE que lo suple, con motivo (`titular_suplente_id`). Ese firmante
 * designado es el único cuyo certificado se admite por el lado ETTE, el autor de
 * las observaciones y el receptor que figura en el Acta 07.
 */
class CoordinacionEtte
{
    /**
     * Firmante designado del lado ETTE del CC: el titular suplente, si el
     * responsable lo designó y sigue siendo titular ETTE; si no, el coordinador
     * vigente. Null si el CC no tiene ninguno.
     *
     * @return array{usuario: User, en_calidad_de: CalidadEtte, motivo_suplencia: ?string}|null
     */
    public function firmanteDe(int $dependenciaId): ?array
    {
        $procesoId = Dependencia::whereKey($dependenciaId)->value('proceso_transferencia_id');
        $entrega = Entrega::with('titularSuplente')->where('proceso_transferencia_id', $procesoId)
            ->where('dependencia_id', $dependenciaId)->first();
        $titular = $entrega?->titularSuplente;
        if ($titular !== null && $titular->activo && $titular->tieneRol(Rol::ETTE)) {
            return ['usuario' => $titular, 'en_calidad_de' => CalidadEtte::TITULAR_SUPLENTE,
                'motivo_suplencia' => $entrega->motivo_suplencia_ette];
        }

        $coordinador = $this->coordinadorDe($dependenciaId);

        return $coordinador !== null
            ? ['usuario' => $coordinador, 'en_calidad_de' => CalidadEtte::COORDINADOR, 'motivo_suplencia' => null]
            : null;
    }

    /** Coordinador ETTE vigente del CC (las asignaciones revocadas se excluyen por scope global). */
    public function coordinadorDe(int $dependenciaId): ?User
    {
        $procesoId = Dependencia::whereKey($dependenciaId)->value('proceso_transferencia_id');

        return AsignacionRol::query()->with('usuario')
            ->where('rol', Rol::DELEGADO_ETTE->value)
            ->where('dependencia_id', $dependenciaId)
            ->where('proceso_transferencia_id', $procesoId)
            ->latest('id')->first()?->usuario;
    }

    /**
     * Titulares ETTE activos del proceso, candidatos a suplir al coordinador.
     *
     * @return Collection<int, User>
     */
    public function titulares(int $procesoId): Collection
    {
        return User::where('activo', true)
            ->whereHas('asignacionesRol', fn ($q) => $q->where('rol', Rol::ETTE->value)
                ->where('proceso_transferencia_id', $procesoId))
            ->orderBy('name')->get();
    }

    /** ¿Consulta el CC por el lado ETTE (coordinador asignado o titular ETTE)? */
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

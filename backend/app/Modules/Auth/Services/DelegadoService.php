<?php

declare(strict_types=1);

namespace App\Modules\Auth\Services;

use App\Models\User;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\Rol;
use Illuminate\Database\Eloquent\Collection;

/**
 * Gestión de delegados ETTE por el comité (RF-008, D2). El comité da de alta,
 * asigna y revoca delegados **limitado a su equipo**: este servicio solo toca
 * asignaciones del rol `delegado_ette`, nunca otros roles ni cuentas
 * institucionales (doc 05 §3). No es la administración general de usuarios.
 *
 * La identificación/alta de cuentas nuevas fuera del padrón sigue en D-08; aquí
 * se designa a cuentas ya existentes. La delegación es por dependencia exacta.
 */
class DelegadoService
{
    /**
     * Lista las designaciones de delegado del proceso activo.
     *
     * @return Collection<int, AsignacionRol>
     */
    public function listar(?int $procesoId = null): Collection
    {
        $procesoId = $procesoId ?? $this->resolverProcesoActivoId();

        return AsignacionRol::query()
            ->with(['usuario:id,dni,name', 'dependencia:id,codigo,nombre'])
            ->where('rol', Rol::DELEGADO_ETTE->value)
            ->where('proceso_transferencia_id', $procesoId)
            ->orderByDesc('id')
            ->get();
    }

    /**
     * Designa a un usuario como delegado ETTE para una dependencia. Idempotente:
     * no duplica una designación existente (la unicidad la refuerza la tabla).
     */
    public function designar(int $userId, int $dependenciaId, ?int $procesoId = null): AsignacionRol
    {
        $procesoId = $procesoId ?? $this->resolverProcesoActivoId();

        // Solo cuentas reales pueden ser delegadas.
        User::findOrFail($userId);

        return AsignacionRol::firstOrCreate([
            'proceso_transferencia_id' => $procesoId,
            'user_id' => $userId,
            'dependencia_id' => $dependenciaId,
            'rol' => Rol::DELEGADO_ETTE->value,
        ]);
    }

    /**
     * Revoca una designación de delegado. Solo elimina asignaciones del rol
     * `delegado_ette`: nunca retira otros roles del usuario (seguridad del
     * alcance del comité). Devuelve false si la asignación no es un delegado.
     */
    public function revocar(int $asignacionId): bool
    {
        $asignacion = AsignacionRol::where('id', $asignacionId)
            ->where('rol', Rol::DELEGADO_ETTE->value)
            ->first();

        if ($asignacion === null) {
            return false;
        }

        return (bool) $asignacion->delete();
    }

    private function resolverProcesoActivoId(): int
    {
        return (int) (ProcesoTransferencia::where('estado', 'abierto')->value('id') ?? 1);
    }
}

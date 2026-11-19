<?php

declare(strict_types=1);

namespace App\Modules\Auth\Services;

use App\Models\User;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\Rol;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Gestión de coordinadores ETTE por el comité (RF-13, RF-15, D-04, D-10). El
 * comité acredita, reemplaza y revoca coordinadores **limitado a su equipo**:
 * este servicio solo toca asignaciones del rol `delegado_ette` (etiqueta
 * "Coordinador ETTE"), nunca otros roles ni cuentas institucionales.
 *
 * La designación es por centro de costo del Anexo 01. Revocar o reemplazar no
 * borra la asignación: la deja revocada para conservar el historial y la
 * constancia; las firmas y observaciones del coordinador anterior no cambian.
 */
class DelegadoService
{
    private const RELACIONES = [
        'usuario:id,dni,name,email,celular',
        'dependencia:id,codigo,codigo_ceplan,nombre,nivel',
        'acreditadaPor:id,name',
        'revocadaPor:id,name',
        'reemplazaA.usuario:id,dni,name',
    ];

    /**
     * Designaciones vigentes del proceso activo.
     *
     * @return Collection<int, AsignacionRol>
     */
    public function listar(?int $procesoId = null): Collection
    {
        return AsignacionRol::query()
            ->with(self::RELACIONES)
            ->where('rol', Rol::DELEGADO_ETTE->value)
            ->where('proceso_transferencia_id', $procesoId ?? $this->resolverProcesoActivoId())
            ->orderByDesc('id')
            ->get();
    }

    /**
     * Designaciones revocadas o reemplazadas (historial).
     *
     * @return Collection<int, AsignacionRol>
     */
    public function historial(?int $procesoId = null): Collection
    {
        return AsignacionRol::conRevocadas()
            ->with(self::RELACIONES)
            ->where('rol', Rol::DELEGADO_ETTE->value)
            ->where('proceso_transferencia_id', $procesoId ?? $this->resolverProcesoActivoId())
            ->whereNotNull('revocada_en')
            ->orderByDesc('revocada_en')
            ->get();
    }

    /**
     * Acredita a un usuario como coordinador ETTE de un centro de costo.
     * Idempotente: no duplica una designación vigente.
     */
    public function designar(int $userId, int $dependenciaId, ?User $acreditador = null, ?string $observacion = null, ?int $procesoId = null): AsignacionRol
    {
        $procesoId = $procesoId ?? $this->resolverProcesoActivoId();
        User::findOrFail($userId);
        $this->exigirCentroCosto($dependenciaId, $procesoId);

        return AsignacionRol::firstOrCreate([
            'proceso_transferencia_id' => $procesoId,
            'user_id' => $userId,
            'dependencia_id' => $dependenciaId,
            'rol' => Rol::DELEGADO_ETTE->value,
        ], [
            'acreditada_en' => now(),
            'acreditada_por_id' => $acreditador?->id,
            'observacion' => $observacion !== null && trim($observacion) !== '' ? trim($observacion) : null,
        ]);
    }

    /**
     * Revoca una designación de coordinador. Solo afecta asignaciones del rol
     * `delegado_ette`: nunca retira otros roles del usuario. Devuelve false si
     * la asignación no es una designación vigente de coordinador.
     */
    public function revocar(int $asignacionId, ?User $usuario = null): bool
    {
        $asignacion = $this->designacionVigente($asignacionId);

        if ($asignacion === null) {
            return false;
        }

        return $asignacion->update(['revocada_en' => now(), 'revocada_por_id' => $usuario?->id]);
    }

    /**
     * Reemplaza al coordinador de una designación (RF-15, RN-12, F-12): revoca la
     * anterior y acredita al nuevo en el mismo CC, enlazando ambas con el motivo.
     * No modifica plazos del cronograma ni firmas u observaciones ya hechas.
     */
    public function reemplazar(int $asignacionId, int $nuevoUserId, string $motivo, User $usuario): AsignacionRol
    {
        return DB::transaction(function () use ($asignacionId, $nuevoUserId, $motivo, $usuario): AsignacionRol {
            $anterior = AsignacionRol::query()->whereKey($asignacionId)
                ->where('rol', Rol::DELEGADO_ETTE->value)->lockForUpdate()->first();

            if ($anterior === null) {
                throw ValidationException::withMessages(['asignacion' => 'La designación de coordinador no existe o ya fue revocada.']);
            }
            if ($anterior->user_id === $nuevoUserId) {
                throw ValidationException::withMessages(['user_id' => 'El nuevo coordinador debe ser una persona distinta.']);
            }

            $yaDesignado = AsignacionRol::query()
                ->where('proceso_transferencia_id', $anterior->proceso_transferencia_id)
                ->where('user_id', $nuevoUserId)
                ->where('dependencia_id', $anterior->dependencia_id)
                ->where('rol', Rol::DELEGADO_ETTE->value)
                ->exists();
            if ($yaDesignado) {
                throw ValidationException::withMessages(['user_id' => 'Esa persona ya es coordinador ETTE de este centro de costo.']);
            }

            User::findOrFail($nuevoUserId);
            $anterior->update(['revocada_en' => now(), 'revocada_por_id' => $usuario->id]);

            return AsignacionRol::create([
                'proceso_transferencia_id' => $anterior->proceso_transferencia_id,
                'user_id' => $nuevoUserId,
                'dependencia_id' => $anterior->dependencia_id,
                'rol' => Rol::DELEGADO_ETTE->value,
                'acreditada_en' => now(),
                'acreditada_por_id' => $usuario->id,
                'reemplaza_a_id' => $anterior->id,
                'motivo_reemplazo' => trim($motivo),
            ])->load(self::RELACIONES);
        });
    }

    /**
     * Designación (vigente o histórica) que resultó de un reemplazo, para su
     * constancia.
     */
    public function designacionDeReemplazo(int $asignacionId): ?AsignacionRol
    {
        return AsignacionRol::conRevocadas()->with(self::RELACIONES)
            ->whereKey($asignacionId)
            ->where('rol', Rol::DELEGADO_ETTE->value)
            ->whereNotNull('reemplaza_a_id')
            ->first();
    }

    /**
     * Coordinadores vigentes de los centros de costo dados, con los reemplazos
     * recientes (aviso al responsable del CC, F-12).
     *
     * @param  list<int>  $dependenciaIds
     * @return list<array{dependencia: array{id: int, codigo: string, nombre: string}, coordinadores: list<array{nombre: string, dni: string, correo: ?string, celular: ?string, acreditado_en: ?string}>, reemplazos: list<array{anterior: ?string, nuevo: ?string, motivo: ?string, fecha: ?string}>}>
     */
    public function coordinadoresDe(array $dependenciaIds, int $diasAviso = 30): array
    {
        $designaciones = AsignacionRol::conRevocadas()
            ->with(['usuario:id,dni,name,email,celular', 'reemplazaA.usuario:id,name', 'dependencia:id,codigo,nombre'])
            ->where('rol', Rol::DELEGADO_ETTE->value)
            ->whereIn('dependencia_id', $dependenciaIds)
            ->get()
            ->groupBy('dependencia_id');

        $desde = now()->subDays($diasAviso);

        return $designaciones->map(fn ($grupo): array => [
            'dependencia' => $grupo->first()->dependencia->only(['id', 'codigo', 'nombre']),
            'coordinadores' => $grupo->filter(fn (AsignacionRol $a): bool => ! $a->estaRevocada())
                ->map(fn (AsignacionRol $a): array => [
                    'nombre' => $a->usuario->name,
                    'dni' => $a->usuario->dni,
                    'correo' => $a->usuario->email,
                    'celular' => $a->usuario->celular,
                    'acreditado_en' => $a->acreditada_en?->toIso8601String(),
                ])->values()->all(),
            'reemplazos' => $grupo->filter(fn (AsignacionRol $a): bool => $a->reemplaza_a_id !== null && $a->acreditada_en?->gte($desde))
                ->map(fn (AsignacionRol $a): array => [
                    'anterior' => $a->reemplazaA?->usuario?->name,
                    'nuevo' => $a->usuario->name,
                    'motivo' => $a->motivo_reemplazo,
                    'fecha' => $a->acreditada_en?->toIso8601String(),
                ])->values()->all(),
        ])->values()->all();
    }

    private function designacionVigente(int $asignacionId): ?AsignacionRol
    {
        return AsignacionRol::query()->whereKey($asignacionId)
            ->where('rol', Rol::DELEGADO_ETTE->value)->first();
    }

    private function exigirCentroCosto(int $dependenciaId, int $procesoId): void
    {
        $esCentro = Dependencia::query()->centrosCosto()->whereKey($dependenciaId)
            ->where('proceso_transferencia_id', $procesoId)->where('activa', true)->exists();

        if (! $esCentro) {
            throw ValidationException::withMessages(['dependencia_id' => 'El coordinador ETTE se designa a un centro de costo activo del Anexo 01.']);
        }
    }

    private function resolverProcesoActivoId(): int
    {
        return (int) (ProcesoTransferencia::where('estado', 'abierto')->value('id') ?? 1);
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\Auth\Services;

use App\Models\User;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Organization\Models\Servidor;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\Rol;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Administración de cuentas y roles institucionales (permiso roles.gestionar,
 * reservado al administrador). Cubre lo que el flujo de activación del padrón no
 * resuelve:
 *
 *  - Alta de **usuarios externos** (ETTE, personal externo) que NO están en el
 *    padrón SGD: se crean como User sin servidor_id (ámbito institucional, no
 *    derivado de un servidor).
 *  - Asignación/revocación de **roles institucionales** (ETTS, ETTE, etc.) a
 *    cuentas existentes, de padrón o externas.
 *
 * Complementa a {@see PrepararActivacion} (activa cuentas del padrón) y a
 * {@see DelegadoService} (gestión acotada de delegados por el comité ETTE).
 */
class GestionUsuariosService
{
    /**
     * Roles que este panel puede asignar o revocar. El rol `administrador` queda
     * deliberadamente fuera para evitar escalada de privilegios por esta vía
     * (decisión de alcance: institucionales sin administrador).
     *
     * @var list<Rol>
     */
    private const ROLES_ASIGNABLES = [
        Rol::ETTS,
        Rol::ETTE,
        Rol::COORDINADOR,
        Rol::RESPONSABLE_EQUIPO,
        Rol::RESPONSABLE_CENTRO_COSTO,
        Rol::DELEGADO_ETTE,
    ];

    /**
     * Roles de visión institucional: su ámbito es global, por lo que NO llevan
     * dependencia (dependencia_id = null). El resto exige una dependencia.
     *
     * @var list<Rol>
     */
    private const ROLES_GLOBALES = [
        Rol::ETTS,
        Rol::ETTE,
    ];

    /**
     * Catálogo de roles asignables con su etiqueta y si requieren dependencia.
     * Lo consume el frontend para construir el formulario de asignación.
     *
     * @return list<array{rol: string, etiqueta: string, requiere_dependencia: bool}>
     */
    public function rolesAsignables(): array
    {
        return array_map(fn (Rol $rol) => [
            'rol' => $rol->value,
            'etiqueta' => $rol->etiqueta(),
            'requiere_dependencia' => ! in_array($rol, self::ROLES_GLOBALES, true),
        ], self::ROLES_ASIGNABLES);
    }

    /**
     * Lista todas las cuentas (de padrón y externas) con sus roles y el servidor
     * vinculado si lo hay. Permite buscar por DNI o nombre.
     *
     * @return LengthAwarePaginator<int, User>
     */
    public function listar(string $buscar = '', int $porPagina = 25): LengthAwarePaginator
    {
        return User::query()
            ->with([
                'servidor:id,dni,dependencia_id',
                'servidor.dependencia:id,codigo,nombre',
                'asignacionesRol:id,user_id,rol,dependencia_id',
                'asignacionesRol.dependencia:id,codigo,nombre',
            ])
            ->when($buscar !== '', function ($q) use ($buscar) {
                $like = '%'.mb_strtolower($buscar).'%';
                $q->where(function ($q) use ($like) {
                    $q->whereRaw('lower(name) like ?', [$like])
                        ->orWhereRaw('lower(dni) like ?', [$like]);
                });
            })
            ->orderBy('name')
            ->paginate($porPagina)
            ->withQueryString();
    }

    /**
     * Crea una cuenta para una persona que no está en el padrón SGD (ETTE o
     * personal externo). La cuenta no se vincula a un servidor (servidor_id
     * null). Opcionalmente asigna un rol inicial.
     *
     * @param  array{dni: string, name: string, email?: ?string, password: string, rol?: ?string, dependencia_id?: ?int}  $datos
     */
    public function crearExterno(array $datos, ?int $procesoId = null): User
    {
        $procesoId = $procesoId ?? $this->resolverProcesoActivoId();

        return DB::transaction(function () use ($datos, $procesoId) {
            if (User::query()->where('dni', $datos['dni'])->exists()) {
                throw ValidationException::withMessages([
                    'dni' => 'Ya existe una cuenta con este DNI.',
                ]);
            }

            $usuario = User::create([
                'dni' => $datos['dni'],
                'name' => $datos['name'],
                'email' => $datos['email'] ?? null,
                'password' => Hash::make($datos['password']),
                'activo' => true,
                'servidor_id' => null,
            ]);

            if (! empty($datos['rol'])) {
                $this->asignarRol(
                    $usuario->id,
                    $datos['rol'],
                    isset($datos['dependencia_id']) ? (int) $datos['dependencia_id'] : null,
                    $procesoId,
                );
            }

            return $usuario;
        });
    }

    /**
     * Asigna un rol institucional a una cuenta existente. Idempotente: no duplica
     * una asignación igual. Valida que el rol sea asignable por este panel y que
     * el ámbito (dependencia) sea coherente con el rol.
     */
    public function asignarRol(int $userId, string $rolValor, ?int $dependenciaId, ?int $procesoId = null): AsignacionRol
    {
        $procesoId = $procesoId ?? $this->resolverProcesoActivoId();

        $rol = Rol::tryFrom($rolValor);
        if ($rol === null || ! in_array($rol, self::ROLES_ASIGNABLES, true)) {
            throw ValidationException::withMessages([
                'rol' => 'El rol indicado no puede asignarse desde este panel.',
            ]);
        }

        $esGlobal = in_array($rol, self::ROLES_GLOBALES, true);

        if ($esGlobal && $dependenciaId !== null) {
            throw ValidationException::withMessages([
                'dependencia_id' => 'Este rol es de alcance institucional y no se asigna a una dependencia.',
            ]);
        }

        if (! $esGlobal && $dependenciaId === null) {
            throw ValidationException::withMessages([
                'dependencia_id' => 'Este rol requiere indicar la dependencia de su ámbito.',
            ]);
        }

        User::findOrFail($userId);

        return AsignacionRol::firstOrCreate([
            'proceso_transferencia_id' => $procesoId,
            'user_id' => $userId,
            'dependencia_id' => $esGlobal ? null : $dependenciaId,
            'rol' => $rol->value,
        ]);
    }

    /**
     * Revoca una asignación de rol. Protecciones:
     *  - Solo revoca roles asignables por este panel (nunca un administrador).
     *  - Nunca deja al sistema sin administradores (no aplica aquí porque
     *    administrador no es revocable, pero se documenta la invariante).
     *
     * @return bool  true si se revocó; false si la asignación no existe o no es revocable.
     */
    public function revocarRol(int $asignacionId): bool
    {
        $asignacion = AsignacionRol::find($asignacionId);

        if ($asignacion === null) {
            return false;
        }

        $rol = $asignacion->rol instanceof Rol ? $asignacion->rol : Rol::tryFrom((string) $asignacion->rol);

        if ($rol === null || ! in_array($rol, self::ROLES_ASIGNABLES, true)) {
            return false;
        }

        return (bool) $asignacion->delete();
    }

    private function resolverProcesoActivoId(): int
    {
        return (int) (ProcesoTransferencia::where('estado', 'abierto')->value('id') ?? 1);
    }
}

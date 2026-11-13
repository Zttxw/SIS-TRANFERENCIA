<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Organization\Models\Servidor;
use App\Support\Enums\Permiso;
use App\Support\Enums\Rol;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['dni', 'name', 'email', 'password', 'activo', 'servidor_id'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'activo' => 'boolean',
        ];
    }

    /** @return HasMany<AsignacionRol, $this> */
    public function asignacionesRol(): HasMany
    {
        return $this->hasMany(AsignacionRol::class);
    }

    /**
     * Servidor del padrón SGD vinculado a esta cuenta (plan §5). La cuenta es la
     * credencial de acceso; el servidor es la persona y la fuente de datos.
     *
     * @return BelongsTo<Servidor, $this>
     */
    public function servidor(): BelongsTo
    {
        return $this->belongsTo(Servidor::class, 'servidor_id');
    }

    /**
     * ¿El usuario tiene el rol dado? Opcionalmente acotado a una dependencia.
     */
    public function tieneRol(Rol $rol, ?int $dependenciaId = null): bool
    {
        return $this->asignacionesRol()
            ->where('rol', $rol->value)
            ->when($dependenciaId !== null, fn ($q) => $q->where('dependencia_id', $dependenciaId))
            ->exists();
    }

    public function esAdministrador(): bool
    {
        return $this->tieneRol(Rol::ADMINISTRADOR);
    }

    /**
     * ¿Alguno de los roles del usuario otorga el permiso dado? Se resuelve contra
     * el catálogo materializado `rol_permiso` (plan §5). Solo cuentas activas.
     */
    public function tienePermiso(Permiso $permiso): bool
    {
        if (! $this->activo) {
            return false;
        }

        $roles = $this->asignacionesRol()->pluck('rol')->all();

        if ($roles === []) {
            return false;
        }

        return DB::table('rol_permiso')
            ->join('permisos', 'permisos.id', '=', 'rol_permiso.permiso_id')
            ->whereIn('rol_permiso.rol', $roles)
            ->where('permisos.codigo', $permiso->value)
            ->exists();
    }

    /**
     * Roles con visión institucional: acceden a todas las dependencias sin
     * acotar por ámbito (plan §5, §6 Etapa 6).
     */
    private const ROLES_AMBITO_GLOBAL = [
        Rol::ADMINISTRADOR,
        Rol::ETTS,
        Rol::ETTE,
    ];

    /**
     * Roles consolidadores: su ámbito es la dependencia asignada **y su
     * subárbol** (plan §6, Etapa 4). El resto de roles (servidor/delegado) solo
     * alcanza la dependencia asignada exacta.
     */
    private const ROLES_CON_SUBARBOL = [
        Rol::RESPONSABLE_CENTRO_COSTO,
        Rol::RESPONSABLE_EQUIPO,
        Rol::COORDINADOR,
    ];

    /**
     * ¿El usuario ve toda la organización, sin acotar por dependencia?
     */
    public function tieneAmbitoGlobal(): bool
    {
        if (! $this->activo) {
            return false;
        }

        return $this->asignacionesRol
            ->contains(fn (AsignacionRol $a) => in_array($a->rol, self::ROLES_AMBITO_GLOBAL, true));
    }

    /**
     * IDs de las dependencias sobre las que el usuario puede operar (plan §5,
     * F8-ámbito). Los roles consolidadores expanden al subárbol de su
     * dependencia; servidor/delegado quedan en la dependencia asignada exacta.
     *
     * Devuelve `null` cuando el ámbito es global (sin filtro): el llamador debe
     * tratar `null` como "todas", no como "ninguna".
     *
     * @return list<int>|null
     */
    public function dependenciasEnAmbito(): ?array
    {
        if ($this->tieneAmbitoGlobal()) {
            return null;
        }

        $ids = [];

        foreach ($this->asignacionesRol as $asignacion) {
            if ($asignacion->dependencia_id === null) {
                continue;
            }

            if (in_array($asignacion->rol, self::ROLES_CON_SUBARBOL, true)) {
                $dependencia = $asignacion->dependencia;
                if ($dependencia !== null) {
                    $ids = array_merge($ids, $dependencia->idsSubarbol());
                }
            } else {
                $ids[] = $asignacion->dependencia_id;
            }
        }

        return array_values(array_unique($ids));
    }

    /**
     * IDs de las dependencias de las que el usuario es responsable directo (las
     * asignadas a su rol), **sin expandir al subárbol**. Son los destinos a los
     * que puede remitirse una entrega para que él la reciba: una entrega de una
     * hija cuyo `dependencia_destino_id` esté aquí va dirigida a este usuario.
     *
     * A diferencia de `dependenciasEnAmbito()`, esto NO incluye a los
     * descendientes; sirve para distinguir «lo mío» de «lo que está bajo mi
     * ámbito» en la bandeja del revisor.
     *
     * @return list<int>
     */
    public function idsDependenciasPropias(): array
    {
        $ids = [];
        foreach ($this->asignacionesRol as $asignacion) {
            if ($asignacion->dependencia_id !== null) {
                $ids[] = $asignacion->dependencia_id;
            }
        }

        return array_values(array_unique($ids));
    }

    /**
     * ¿El usuario puede operar sobre la dependencia dada (o su ámbito la
     * incluye)? Base de las comprobaciones de ámbito en servicios/controllers.
     */
    public function puedeAccederDependencia(int $dependenciaId): bool
    {
        $ambito = $this->dependenciasEnAmbito();

        // Ámbito global: acceso a cualquier dependencia.
        if ($ambito === null) {
            return $this->activo;
        }

        return in_array($dependenciaId, $ambito, true);
    }
}

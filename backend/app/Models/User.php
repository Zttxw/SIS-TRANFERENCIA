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
}

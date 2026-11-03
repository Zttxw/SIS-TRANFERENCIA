<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Organization\Models\Servidor;
use App\Support\Enums\Rol;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password'])]
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
        ];
    }

    /** @return HasMany<AsignacionRol, $this> */
    public function asignacionesRol(): HasMany
    {
        return $this->hasMany(AsignacionRol::class);
    }

    /** @return HasOne<Servidor, $this> */
    public function servidor(): HasOne
    {
        return $this->hasOne(Servidor::class);
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
}

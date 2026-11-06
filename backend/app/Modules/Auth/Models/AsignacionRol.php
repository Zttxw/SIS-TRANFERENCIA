<?php

declare(strict_types=1);

namespace App\Modules\Auth\Models;

use App\Models\User;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Concerns\Auditable;
use App\Support\Enums\Rol;
use App\Support\Models\BaseModel;
use Database\Factories\AsignacionRolFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Asignación de un rol a un usuario dentro de un ámbito (dependencia) y proceso.
 *
 * @property int $id
 * @property Rol $rol
 * @property ?int $dependencia_id
 */
class AsignacionRol extends BaseModel
{
    /** @use HasFactory<AsignacionRolFactory> */
    use Auditable, HasFactory;

    protected static function newFactory(): AsignacionRolFactory
    {
        return AsignacionRolFactory::new();
    }

    protected $table = 'asignaciones_rol';

    protected $fillable = [
        'proceso_transferencia_id',
        'user_id',
        'dependencia_id',
        'rol',
    ];

    protected function casts(): array
    {
        return [
            'rol' => Rol::class,
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /** @return BelongsTo<Dependencia, $this> */
    public function dependencia(): BelongsTo
    {
        return $this->belongsTo(Dependencia::class);
    }

    /** @return BelongsTo<ProcesoTransferencia, $this> */
    public function proceso(): BelongsTo
    {
        return $this->belongsTo(ProcesoTransferencia::class, 'proceso_transferencia_id');
    }
}

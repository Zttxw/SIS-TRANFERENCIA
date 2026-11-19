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
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Asignación de un rol a un usuario dentro de un ámbito (dependencia) y proceso.
 *
 * Una asignación revocada (`revocada_en`) no otorga nada: el scope global
 * `vigente` la excluye de toda consulta. Se conserva como historial del
 * reemplazo de coordinadores ETTE (RF-15); se consulta con `conRevocadas()`.
 *
 * @property int $id
 * @property Rol $rol
 * @property ?int $dependencia_id
 * @property ?Carbon $acreditada_en
 * @property ?Carbon $revocada_en
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
        'acreditada_en',
        'acreditada_por_id',
        'observacion',
        'reemplaza_a_id',
        'motivo_reemplazo',
        'revocada_en',
        'revocada_por_id',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope('vigente', fn (Builder $query) => $query->whereNull($query->qualifyColumn('revocada_en')));
    }

    protected function casts(): array
    {
        return [
            'rol' => Rol::class,
            'acreditada_en' => 'datetime',
            'revocada_en' => 'datetime',
        ];
    }

    /**
     * Incluye las asignaciones revocadas (historial).
     *
     * @return Builder<static>
     */
    public static function conRevocadas(): Builder
    {
        return static::withoutGlobalScope('vigente');
    }

    public function estaRevocada(): bool
    {
        return $this->revocada_en !== null;
    }

    /** @return BelongsTo<User, $this> */
    public function acreditadaPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'acreditada_por_id');
    }

    /** @return BelongsTo<User, $this> */
    public function revocadaPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'revocada_por_id');
    }

    /** @return BelongsTo<self, $this> */
    public function reemplazaA(): BelongsTo
    {
        return $this->belongsTo(self::class, 'reemplaza_a_id')->withoutGlobalScope('vigente');
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

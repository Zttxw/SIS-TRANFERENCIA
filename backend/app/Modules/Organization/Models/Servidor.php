<?php

declare(strict_types=1);

namespace App\Modules\Organization\Models;

use App\Models\User;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Concerns\Auditable;
use App\Support\Concerns\HasFuenteDato;
use App\Support\Enums\FuenteDato;
use App\Support\Models\BaseModel;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Servidor público del inventario organizacional. Persona registrada en el SGD;
 * puede o no tener una cuenta de acceso (user_id).
 *
 * @property int $id
 * @property string $dni
 * @property string $nombres
 * @property ?string $cargo
 * @property bool $es_responsable
 */
class Servidor extends BaseModel
{
    use Auditable, HasFuenteDato, SoftDeletes;

    protected $table = 'servidores';

    protected FuenteDato $fuentePorDefecto = FuenteDato::SGD;

    protected $fillable = [
        'proceso_transferencia_id',
        'dependencia_id',
        'user_id',
        'codigo_sgd',
        'dni',
        'nombres',
        'apellidos',
        'email',
        'cargo',
        'regimen_laboral',
        'modalidad_contractual',
        'situacion_laboral',
        'es_responsable',
        'fuente',
        'fuente_referencia',
        'extraido_en',
    ];

    protected function casts(): array
    {
        return [
            'es_responsable' => 'boolean',
        ];
    }

    /** @return BelongsTo<ProcesoTransferencia, $this> */
    public function proceso(): BelongsTo
    {
        return $this->belongsTo(ProcesoTransferencia::class, 'proceso_transferencia_id');
    }

    /** @return BelongsTo<Dependencia, $this> */
    public function dependencia(): BelongsTo
    {
        return $this->belongsTo(Dependencia::class);
    }

    /**
     * Cuenta de acceso vinculada a este servidor, si existe (users.servidor_id).
     *
     * @return HasOne<User, $this>
     */
    public function cuenta(): HasOne
    {
        return $this->hasOne(User::class, 'servidor_id');
    }

    public function tieneCuenta(): bool
    {
        return $this->cuenta()->exists();
    }

    public function nombreCompleto(): string
    {
        return trim("{$this->nombres} {$this->apellidos}");
    }

    /** @param  Builder<static>  $query */
    public function scopeResponsables(Builder $query): Builder
    {
        return $query->where('es_responsable', true);
    }
}

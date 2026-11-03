<?php

declare(strict_types=1);

namespace App\Modules\Organization\Models;

use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Concerns\Auditable;
use App\Support\Concerns\HasFuenteDato;
use App\Support\Enums\FuenteDato;
use App\Support\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Dependencia / centro de costo. Nodo de la jerarquía organizacional (SGD).
 *
 * @property int $id
 * @property ?int $parent_id
 * @property string $codigo
 * @property string $nombre
 * @property int $nivel
 */
class Dependencia extends BaseModel
{
    use Auditable, HasFuenteDato, SoftDeletes;

    protected $table = 'dependencias';

    protected FuenteDato $fuentePorDefecto = FuenteDato::SGD;

    protected $fillable = [
        'proceso_transferencia_id',
        'parent_id',
        'codigo',
        'codigo_sgd',
        'nombre',
        'tipo',
        'nivel',
        'activa',
        'fuente',
        'fuente_referencia',
        'extraido_en',
    ];

    protected function casts(): array
    {
        return [
            'nivel' => 'integer',
            'activa' => 'boolean',
        ];
    }

    /** @return BelongsTo<ProcesoTransferencia, $this> */
    public function proceso(): BelongsTo
    {
        return $this->belongsTo(ProcesoTransferencia::class, 'proceso_transferencia_id');
    }

    /** @return BelongsTo<Dependencia, $this> */
    public function padre(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    /** @return HasMany<Dependencia, $this> */
    public function hijas(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    /** @return HasMany<Servidor, $this> */
    public function servidores(): HasMany
    {
        return $this->hasMany(Servidor::class);
    }

    public function esRaiz(): bool
    {
        return $this->parent_id === null;
    }
}

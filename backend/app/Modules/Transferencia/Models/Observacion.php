<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Models;

use App\Models\User;
use App\Support\Concerns\Auditable;
use App\Support\Enums\EstadoObservacion;
use App\Support\Models\BaseModel;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Observación formulada sobre un anexo o elemento cualquiera (polimórfica).
 *
 * @property EstadoObservacion $estado
 */
class Observacion extends BaseModel
{
    use Auditable, SoftDeletes;

    protected $table = 'observaciones';

    protected $fillable = [
        'proceso_transferencia_id',
        'observable_type',
        'observable_id',
        'autor_id',
        'responsable_id',
        'descripcion',
        'estado',
        'respuesta_subsanacion',
        'subsanada_en',
    ];

    protected function casts(): array
    {
        return [
            'estado' => EstadoObservacion::class,
            'subsanada_en' => 'datetime',
        ];
    }

    /** @return MorphTo<Model, $this> */
    public function observable(): MorphTo
    {
        return $this->morphTo();
    }

    /** @return BelongsTo<User, $this> */
    public function autor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'autor_id');
    }

    /** @return BelongsTo<User, $this> */
    public function responsable(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responsable_id');
    }

    /** @param  Builder<static>  $query */
    public function scopeAbiertas(Builder $query): Builder
    {
        return $query->whereIn('estado', [
            EstadoObservacion::ABIERTA->value,
            EstadoObservacion::EN_SUBSANACION->value,
        ]);
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Models;

use App\Models\User;
use App\Modules\Organization\Models\Dependencia;
use App\Support\Concerns\Auditable;
use App\Support\Enums\EstadoEntrega;
use App\Support\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Entrega jerárquica de información entre dependencias (plan §7.8).
 *
 * @property EstadoEntrega $estado
 */
class Entrega extends BaseModel
{
    use Auditable, SoftDeletes;

    protected $table = 'entregas';

    protected $fillable = [
        'proceso_transferencia_id',
        'dependencia_id',
        'dependencia_destino_id',
        'emisor_id',
        'receptor_id',
        'estado',
        'remitida_en',
        'revisada_en',
        'consolidada_en',
        'comentario',
    ];

    protected function casts(): array
    {
        return [
            'estado' => EstadoEntrega::class,
            'remitida_en' => 'datetime',
            'revisada_en' => 'datetime',
            'consolidada_en' => 'datetime',
        ];
    }

    /** @return BelongsTo<Dependencia, $this> */
    public function dependencia(): BelongsTo
    {
        return $this->belongsTo(Dependencia::class);
    }

    /** @return BelongsTo<Dependencia, $this> */
    public function dependenciaDestino(): BelongsTo
    {
        return $this->belongsTo(Dependencia::class, 'dependencia_destino_id');
    }

    /** @return BelongsTo<User, $this> */
    public function emisor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'emisor_id');
    }

    /** @return BelongsTo<User, $this> */
    public function receptor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'receptor_id');
    }

    public function esModificable(): bool
    {
        return in_array($this->estado, [EstadoEntrega::BORRADOR, EstadoEntrega::OBSERVADA], true);
    }
}

<?php

declare(strict_types=1);

namespace App\Support\Models;

use App\Models\User;
use App\Support\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * Bitácora transversal de operaciones relevantes: conserva usuario, fecha,
 * hora y registro afectado (RN-14). Alimentada por el trait {@see Auditable}.
 *
 * @property string $evento
 * @property ?array<string, mixed> $valores_anteriores
 * @property ?array<string, mixed> $valores_nuevos
 */
class MovimientoAuditoria extends BaseModel
{
    protected $table = 'movimientos_auditoria';

    protected $fillable = [
        'auditable_type',
        'auditable_id',
        'user_id',
        'evento',
        'valores_anteriores',
        'valores_nuevos',
        'ip',
    ];

    protected function casts(): array
    {
        return [
            'valores_anteriores' => 'array',
            'valores_nuevos' => 'array',
        ];
    }

    /** @return MorphTo<Model, $this> */
    public function auditable(): MorphTo
    {
        return $this->morphTo();
    }

    /** @return BelongsTo<User, $this> */
    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}

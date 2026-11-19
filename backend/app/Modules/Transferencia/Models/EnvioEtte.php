<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Models;

use App\Models\User;
use App\Support\Concerns\Auditable;
use App\Support\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Lote de entregas que el ETTS envía al ETTE (D-12, RF-73, RF-75). Cada envío,
 * de uno o varios CC, tiene un número correlativo por proceso y su constancia
 * de entrega.
 *
 * @property int $id
 * @property int $numero
 * @property Carbon $enviado_en
 */
class EnvioEtte extends BaseModel
{
    use Auditable;

    protected $table = 'envios_ette';

    protected $fillable = [
        'proceso_transferencia_id',
        'numero',
        'enviado_por_id',
        'enviado_en',
        'comentario',
    ];

    protected function casts(): array
    {
        return [
            'numero' => 'integer',
            'enviado_en' => 'datetime',
        ];
    }

    /** Código legible del lote: CE-<año>-<número>. */
    public function codigo(): string
    {
        return sprintf('CE-%d-%03d', $this->enviado_en->year, $this->numero);
    }

    /** @return BelongsTo<User, $this> */
    public function enviadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'enviado_por_id');
    }

    /** @return HasMany<Entrega, $this> */
    public function entregas(): HasMany
    {
        return $this->hasMany(Entrega::class, 'envio_ette_id');
    }
}

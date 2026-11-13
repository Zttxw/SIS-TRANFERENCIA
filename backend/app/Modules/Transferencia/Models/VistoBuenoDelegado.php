<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Models;

use App\Models\User;
use App\Modules\Organization\Models\Dependencia;
use App\Support\Concerns\Auditable;
use App\Support\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Visto bueno del delegado ETTE sobre lo remitido por una dependencia que tiene
 * asignada (GAP 2 del portal del delegado). Es una constancia de conformidad
 * acotada a su ámbito: NO consolida ni cambia el estado de la entrega (eso es
 * atribución de responsable/ETTS). Deja trazabilidad de quién, cuándo y sobre
 * qué dependencia.
 */
class VistoBuenoDelegado extends BaseModel
{
    use Auditable, SoftDeletes;

    protected $table = 'vistos_buenos_delegado';

    protected $fillable = [
        'proceso_transferencia_id',
        'dependencia_id',
        'delegado_id',
        'otorgado_en',
        'comentario',
    ];

    protected function casts(): array
    {
        return [
            'otorgado_en' => 'datetime',
        ];
    }

    /** @return BelongsTo<Dependencia, $this> */
    public function dependencia(): BelongsTo
    {
        return $this->belongsTo(Dependencia::class);
    }

    /** @return BelongsTo<User, $this> */
    public function delegado(): BelongsTo
    {
        return $this->belongsTo(User::class, 'delegado_id');
    }
}

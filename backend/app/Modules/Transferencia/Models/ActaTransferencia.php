<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Models;

use App\Models\User;
use App\Modules\Organization\Models\Dependencia;
use App\Support\Concerns\Auditable;
use App\Support\Concerns\TieneEvidencias;
use App\Support\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Acta de transferencia (Anexo 07).
 *
 * @property ?array<int, array<string, mixed>> $intervinientes
 * @property ?array<int, array<string, mixed>> $anexos_entregados
 */
class ActaTransferencia extends BaseModel
{
    use Auditable, SoftDeletes, TieneEvidencias;

    protected $table = 'actas_transferencia';

    protected $fillable = [
        'proceso_transferencia_id',
        'dependencia_id',
        'numero_acta',
        'fecha_acta',
        'intervinientes',
        'anexos_entregados',
        'observaciones',
        'estado',
        'ruta_pdf',
        'ruta_pdf_suscrito',
        'generada_por_id',
    ];

    protected function casts(): array
    {
        return [
            'fecha_acta' => 'date',
            'intervinientes' => 'array',
            'anexos_entregados' => 'array',
        ];
    }

    /** @return BelongsTo<Dependencia, $this> */
    public function dependencia(): BelongsTo
    {
        return $this->belongsTo(Dependencia::class);
    }

    /** @return BelongsTo<User, $this> */
    public function generadaPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'generada_por_id');
    }
}

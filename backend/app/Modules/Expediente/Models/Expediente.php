<?php

declare(strict_types=1);

namespace App\Modules\Expediente\Models;

use App\Models\User;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Concerns\Auditable;
use App\Support\Concerns\TieneEvidencias;
use App\Support\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Expediente digital por centro de costo (plan §7.12).
 *
 * @property string $estado
 */
class Expediente extends BaseModel
{
    use Auditable, SoftDeletes, TieneEvidencias;

    protected $table = 'expedientes';

    protected $fillable = [
        'proceso_transferencia_id',
        'dependencia_id',
        'codigo',
        'estado',
        'cerrado_en',
        'cerrado_por_id',
    ];

    protected function casts(): array
    {
        return [
            'cerrado_en' => 'datetime',
        ];
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

    /** @return BelongsTo<User, $this> */
    public function cerradoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cerrado_por_id');
    }

    /** Un expediente cerrado no admite modificaciones directas (RN-13). */
    public function estaCerrado(): bool
    {
        return $this->estado === 'cerrado';
    }
}

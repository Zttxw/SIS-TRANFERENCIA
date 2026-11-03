<?php

declare(strict_types=1);

namespace App\Modules\Patrimonio\Models;

use App\Models\User;
use App\Support\Concerns\Auditable;
use App\Support\Enums\EstadoConservacion;
use App\Support\Enums\EstadoVerificacionBien;
use App\Support\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Resultado de la verificación física de un bien por el servidor (plan §4.2).
 * No altera el registro de origen del SIGA (RN-06).
 *
 * @property EstadoVerificacionBien $estado
 * @property ?EstadoConservacion $estado_conservacion
 */
class VerificacionBien extends BaseModel
{
    use Auditable;

    protected $table = 'verificaciones_bien';

    protected $fillable = [
        'bien_patrimonial_id',
        'verificado_por_id',
        'estado',
        'estado_conservacion',
        'observacion',
        'verificado_en',
    ];

    protected function casts(): array
    {
        return [
            'estado' => EstadoVerificacionBien::class,
            'estado_conservacion' => EstadoConservacion::class,
            'verificado_en' => 'datetime',
        ];
    }

    /** @return BelongsTo<BienPatrimonial, $this> */
    public function bien(): BelongsTo
    {
        return $this->belongsTo(BienPatrimonial::class, 'bien_patrimonial_id');
    }

    /** @return BelongsTo<User, $this> */
    public function verificadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verificado_por_id');
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\NoPatrimonial\Models;

use App\Models\User;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Organization\Models\Servidor;
use App\Support\Concerns\Auditable;
use App\Support\Concerns\TieneEvidencias;
use App\Support\Enums\EstadoConservacion;
use App\Support\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Bien no patrimonializado registrado manualmente (Anexo 06).
 *
 * @property string $denominacion
 * @property ?EstadoConservacion $estado_conservacion
 */
class BienNoPatrimonial extends BaseModel
{
    use Auditable, SoftDeletes, TieneEvidencias;

    protected $table = 'bienes_no_patrimoniales';

    protected $fillable = [
        'proceso_transferencia_id',
        'dependencia_id',
        'servidor_id',
        'registrado_por_id',
        'denominacion',
        'descripcion',
        'cantidad',
        'unidad_medida',
        'estado_conservacion',
        'ubicacion',
        'observaciones',
        'fuente',
    ];

    protected function casts(): array
    {
        return [
            'cantidad' => 'decimal:2',
            'estado_conservacion' => EstadoConservacion::class,
        ];
    }

    /** @return BelongsTo<Dependencia, $this> */
    public function dependencia(): BelongsTo
    {
        return $this->belongsTo(Dependencia::class);
    }

    /** @return BelongsTo<Servidor, $this> */
    public function servidor(): BelongsTo
    {
        return $this->belongsTo(Servidor::class);
    }

    /** @return BelongsTo<User, $this> */
    public function registradoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'registrado_por_id');
    }
}

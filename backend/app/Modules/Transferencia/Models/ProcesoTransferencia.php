<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Models;

use App\Modules\Organization\Models\Dependencia;
use App\Support\Concerns\Auditable;
use App\Support\Models\BaseModel;
use Database\Factories\ProcesoTransferenciaFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $anio
 * @property Carbon $fecha_corte
 * @property string $estado
 * @property bool $exige_firma_acta
 */
class ProcesoTransferencia extends BaseModel
{
    /** @use HasFactory<ProcesoTransferenciaFactory> */
    use Auditable, HasFactory, SoftDeletes;

    protected static function newFactory(): ProcesoTransferenciaFactory
    {
        return ProcesoTransferenciaFactory::new();
    }

    protected $table = 'procesos_transferencia';

    protected $fillable = [
        'nombre',
        'anio',
        'fecha_corte',
        'estado',
        'exige_firma_acta',
        'descripcion',
        'cerrado_en',
    ];

    protected function casts(): array
    {
        return [
            'fecha_corte' => 'date',
            'cerrado_en' => 'datetime',
            'anio' => 'integer',
            'exige_firma_acta' => 'boolean',
        ];
    }

    /** @return HasMany<Dependencia, $this> */
    public function dependencias(): HasMany
    {
        return $this->hasMany(Dependencia::class);
    }

    public function estaCerrado(): bool
    {
        return $this->estado === 'cerrado';
    }

    /** @param  Builder<static>  $query */
    public function scopeAbiertos(Builder $query): Builder
    {
        return $query->where('estado', '!=', 'cerrado');
    }
}

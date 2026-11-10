<?php

declare(strict_types=1);

namespace App\Modules\Acervo\Models;

use App\Models\User;
use App\Modules\Organization\Models\Dependencia;
use App\Support\Concerns\Auditable;
use App\Support\Concerns\HasFuenteDato;
use App\Support\Concerns\TieneEvidencias;
use App\Support\Models\BaseModel;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Registro de acervo documentario (Anexo 03): físico o digital.
 *
 * @property string $tipo
 */
class AcervoDocumental extends BaseModel
{
    use Auditable, HasFuenteDato, SoftDeletes, TieneEvidencias;

    protected $table = 'acervo_documental';

    public const TIPO_DIGITAL = 'digital';

    public const TIPO_FISICO = 'fisico';

    protected $fillable = [
        'proceso_transferencia_id',
        'dependencia_id',
        'registrado_por_id',
        'tipo',
        'serie_documental',
        'anio',
        'desde_anio',
        'hasta_anio',
        'periodo',
        'cantidad_unidades',
        'unidad_conservacion',
        'ubicacion',
        'descripcion',
        'observaciones',
        'fuente',
        'fuente_referencia',
        'extraido_en',
    ];

    protected function casts(): array
    {
        return [
            'cantidad_unidades' => 'integer',
            'anio' => 'integer',
            'desde_anio' => 'integer',
            'hasta_anio' => 'integer',
        ];
    }

    /** @return BelongsTo<Dependencia, $this> */
    public function dependencia(): BelongsTo
    {
        return $this->belongsTo(Dependencia::class);
    }

    /** @return BelongsTo<User, $this> */
    public function registradoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'registrado_por_id');
    }

    /** @param  Builder<static>  $query */
    public function scopeFisico(Builder $query): Builder
    {
        return $query->where('tipo', self::TIPO_FISICO);
    }

    /** @param  Builder<static>  $query */
    public function scopeDigital(Builder $query): Builder
    {
        return $query->where('tipo', self::TIPO_DIGITAL);
    }
}

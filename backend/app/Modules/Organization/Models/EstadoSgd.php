<?php

declare(strict_types=1);

namespace App\Modules\Organization\Models;

use App\Support\Models\BaseModel;
use Illuminate\Database\Eloquent\Builder;

/**
 * Catálogo de estados documentales del SGD (TDTR_ESTADOS), limitado a los
 * dominios documentales. Copia local de solo lectura (RN-03).
 *
 * Dominio `TDTV_REMITOS` = estado de emisión del documento;
 * dominio `TDTV_DESTINOS` = estado de recepción del destino.
 *
 * @property int $id
 * @property string $dominio
 * @property string $codigo
 * @property string $descripcion
 */
class EstadoSgd extends BaseModel
{
    public const DOMINIO_EMISION = 'TDTV_REMITOS';

    public const DOMINIO_RECEPCION = 'TDTV_DESTINOS';

    protected $table = 'estados_sgd';

    protected $fillable = [
        'dominio',
        'codigo',
        'descripcion',
        'extraido_en',
    ];

    protected function casts(): array
    {
        return [
            'extraido_en' => 'datetime',
        ];
    }

    /** @param  Builder<static>  $query */
    public function scopeEmision(Builder $query): Builder
    {
        return $query->where('dominio', self::DOMINIO_EMISION);
    }

    /** @param  Builder<static>  $query */
    public function scopeRecepcion(Builder $query): Builder
    {
        return $query->where('dominio', self::DOMINIO_RECEPCION);
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\Organization\Models;

use App\Support\Models\BaseModel;

/**
 * Catálogo de tipos documentales del SGD (SI_MAE_TIPO_DOC). Copia local de
 * solo lectura para normalizar los módulos documentales (RN-03).
 *
 * @property int $id
 * @property string $codigo
 * @property ?string $descripcion
 * @property bool $activo
 */
class TipoDocumentalSgd extends BaseModel
{
    protected $table = 'tipos_documentales_sgd';

    protected $fillable = [
        'codigo',
        'descripcion',
        'activo',
        'extraido_en',
    ];

    protected function casts(): array
    {
        return [
            'activo' => 'boolean',
            'extraido_en' => 'datetime',
        ];
    }
}

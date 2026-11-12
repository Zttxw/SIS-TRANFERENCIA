<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Borrador oficial sobrescribible de un documento. Una fila por
 * (proceso, dependencia, tipo_documento); no versiona.
 */
class FirmaBorrador extends Model
{
    protected $table = 'firma_borradores';

    protected $guarded = [];

    protected function casts(): array
    {
        return ['generado_en' => 'datetime'];
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Models;

use App\Support\Concerns\Auditable;
use App\Support\Enums\AlcanceFeriado;
use App\Support\Models\BaseModel;
use Database\Factories\FeriadoFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Carbon;

/**
 * Día no laborable del calendario (RF-22). Lo excluye el cálculo en días
 * hábiles del cronograma (CalendarioHabil).
 *
 * @property Carbon $fecha
 * @property AlcanceFeriado $alcance
 */
class Feriado extends BaseModel
{
    /** @use HasFactory<FeriadoFactory> */
    use Auditable, HasFactory;

    protected $table = 'feriados';

    protected $fillable = ['fecha', 'descripcion', 'alcance'];

    protected static function newFactory(): FeriadoFactory
    {
        return FeriadoFactory::new();
    }

    protected function casts(): array
    {
        return [
            'fecha' => 'date:Y-m-d',
            'alcance' => AlcanceFeriado::class,
        ];
    }
}

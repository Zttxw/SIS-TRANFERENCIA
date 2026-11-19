<?php

declare(strict_types=1);

namespace App\Support\Concerns;

use App\Modules\Transferencia\Models\Observacion;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * Fila de anexo que el coordinador ETTE puede observar (D-07).
 */
trait TieneObservaciones
{
    /** @return MorphMany<Observacion, $this> */
    public function observaciones(): MorphMany
    {
        return $this->morphMany(Observacion::class, 'observable');
    }
}

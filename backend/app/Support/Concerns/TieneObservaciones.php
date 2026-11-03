<?php

declare(strict_types=1);

namespace App\Support\Concerns;

use App\Modules\Transferencia\Models\Observacion;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * Permite adjuntar observaciones a cualquier anexo o elemento (plan §7.9).
 */
trait TieneObservaciones
{
    /** @return MorphMany<Observacion, $this> */
    public function observaciones(): MorphMany
    {
        return $this->morphMany(Observacion::class, 'observable');
    }

    public function tieneObservacionesAbiertas(): bool
    {
        return $this->observaciones()->abiertas()->exists();
    }
}

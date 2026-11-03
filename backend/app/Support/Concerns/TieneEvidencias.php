<?php

declare(strict_types=1);

namespace App\Support\Concerns;

use App\Support\Models\Evidencia;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * Permite adjuntar evidencias documentales a cualquier modelo (plan §7, RN-14).
 */
trait TieneEvidencias
{
    /** @return MorphMany<Evidencia, $this> */
    public function evidencias(): MorphMany
    {
        return $this->morphMany(Evidencia::class, 'evidenciable');
    }
}

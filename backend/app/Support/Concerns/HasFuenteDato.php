<?php

declare(strict_types=1);

namespace App\Support\Concerns;

use App\Support\Enums\FuenteDato;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

/**
 * Para modelos cuyo registro proviene de SGD/SIGA o es manual (RN-03).
 *
 * Requiere que la tabla tenga las columnas: fuente (string), fuente_referencia
 * (string, nullable), extraido_en (timestamp, nullable).
 *
 * @property FuenteDato $fuente
 * @property ?string $fuente_referencia
 * @property ?Carbon $extraido_en
 */
trait HasFuenteDato
{
    public function initializeHasFuenteDato(): void
    {
        $this->mergeCasts([
            'fuente' => FuenteDato::class,
            'extraido_en' => 'datetime',
        ]);

        // Default a nivel de modelo para que el enum esté disponible antes de
        // persistir. Cada modelo puede sobreescribirlo con $fuentePorDefecto.
        if (! array_key_exists('fuente', $this->attributes)) {
            $this->attributes['fuente'] = (property_exists($this, 'fuentePorDefecto')
                ? $this->fuentePorDefecto
                : FuenteDato::MANUAL)->value;
        }
    }

    public function esManual(): bool
    {
        return $this->fuente === FuenteDato::MANUAL;
    }

    public function esImportado(): bool
    {
        return ! $this->esManual();
    }

    /** @param  Builder<static>  $query */
    public function scopeDeFuente(Builder $query, FuenteDato $fuente): Builder
    {
        return $query->where('fuente', $fuente->value);
    }
}

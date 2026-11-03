<?php

declare(strict_types=1);

namespace App\Support\Concerns;

use App\Support\Models\MovimientoAuditoria;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * Registra automáticamente en la bitácora de auditoría las operaciones de
 * creación, actualización y eliminación del modelo (RN-14).
 *
 * Los atributos sensibles declarados en $auditExcluded no se almacenan.
 */
trait Auditable
{
    public static function bootAuditable(): void
    {
        static::created(fn ($model) => $model->registrarAuditoria('creado', null, $model->getAttributes()));

        static::updated(function ($model) {
            if ($model->wasChanged()) {
                $model->registrarAuditoria('actualizado', $model->getOriginal(), $model->getChanges());
            }
        });

        static::deleted(fn ($model) => $model->registrarAuditoria('eliminado', $model->getOriginal(), null));
    }

    /** @return MorphMany<MovimientoAuditoria, $this> */
    public function movimientosAuditoria(): MorphMany
    {
        return $this->morphMany(MovimientoAuditoria::class, 'auditable');
    }

    /**
     * @param  array<string, mixed>|null  $anteriores
     * @param  array<string, mixed>|null  $nuevos
     */
    protected function registrarAuditoria(string $evento, ?array $anteriores, ?array $nuevos): void
    {
        $this->movimientosAuditoria()->create([
            'user_id' => auth()->id(),
            'evento' => $evento,
            'valores_anteriores' => $this->filtrarAuditables($anteriores),
            'valores_nuevos' => $this->filtrarAuditables($nuevos),
            'ip' => request()?->ip(),
        ]);
    }

    /**
     * @param  array<string, mixed>|null  $valores
     * @return array<string, mixed>|null
     */
    protected function filtrarAuditables(?array $valores): ?array
    {
        if ($valores === null) {
            return null;
        }

        $excluidos = array_merge(
            ['password', 'remember_token'],
            property_exists($this, 'auditExcluded') ? $this->auditExcluded : [],
        );

        return array_diff_key($valores, array_flip($excluidos));
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Models;

use App\Models\User;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Services\ObservacionService;
use App\Support\Concerns\Auditable;
use App\Support\Enums\CalidadEtte;
use App\Support\Enums\EstadoObservacion;
use App\Support\Models\BaseModel;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Observación del coordinador ETTE sobre un anexo de un centro de costo (D-07).
 * Es una constancia: no se subsana ni devuelve la entrega. Se formula sobre una
 * fila del anexo (`observable`) o sobre el anexo completo (sin observable).
 * `autor_id` es el coordinador (o titular suplente) presente en la revisión;
 * `registrada_por_id`, el responsable del CC que la registró en su sesión.
 *
 * @property EstadoObservacion $estado
 */
class Observacion extends BaseModel
{
    use Auditable, SoftDeletes;

    protected $table = 'observaciones';

    protected $fillable = [
        'proceso_transferencia_id',
        'dependencia_id',
        'anexo',
        'observable_type',
        'observable_id',
        'autor_id',
        'registrada_por_id',
        'en_calidad_de',
        'motivo_suplencia',
        'descripcion',
        'estado',
    ];

    protected function casts(): array
    {
        return [
            'estado' => EstadoObservacion::class,
            'en_calidad_de' => CalidadEtte::class,
        ];
    }

    /**
     * Una observación sobre una fila hereda el CC y el anexo de esa fila.
     */
    protected static function booted(): void
    {
        static::creating(function (Observacion $observacion): void {
            if ($observacion->observable_type === null) {
                return;
            }
            $observacion->anexo ??= array_search($observacion->observable_type, ObservacionService::anexosObservables(), true) ?: null;
            $observacion->dependencia_id ??= $observacion->observable?->dependencia_id;
        });
    }

    /** Anexo observado, en lenguaje del acta y de los reportes. */
    public function etiquetaAnexo(): string
    {
        return match ($this->anexo) {
            'gestion' => 'Anexo 02 — Informe de Gestión',
            'acervo' => 'Anexo 03 — Acervo',
            'patrimonio' => 'Anexo 04 — Patrimonio',
            'personal' => 'Anexo 05 — Personal',
            'nopatrimonial' => 'Anexo 06 — No Patrimonial',
            'documento' => 'Anexo 02 — Documentos pendientes',
            default => (string) $this->anexo,
        };
    }

    /** @return BelongsTo<Dependencia, $this> */
    public function dependencia(): BelongsTo
    {
        return $this->belongsTo(Dependencia::class);
    }

    /** @return MorphTo<Model, $this> */
    public function observable(): MorphTo
    {
        return $this->morphTo();
    }

    /** @return BelongsTo<User, $this> */
    public function autor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'autor_id');
    }

    /** @return BelongsTo<User, $this> */
    public function registradaPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'registrada_por_id');
    }

    /**
     * Observaciones vigentes: registradas y no retiradas.
     *
     * @param  Builder<static>  $query
     */
    public function scopeVigentes(Builder $query): Builder
    {
        return $query->where('estado', EstadoObservacion::REGISTRADA->value);
    }

    /** @param  Builder<static>  $query */
    public function scopeDelCentroCosto(Builder $query, int $dependenciaId, int $procesoId): Builder
    {
        return $query->where('proceso_transferencia_id', $procesoId)->where('dependencia_id', $dependenciaId);
    }
}

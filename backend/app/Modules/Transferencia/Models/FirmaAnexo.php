<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Models;

use App\Models\User;
use App\Support\Concerns\Auditable;
use App\Support\Enums\CalidadEtte;
use App\Support\Enums\EstadoFirma;
use App\Support\Enums\LadoFirma;
use App\Support\Models\BaseModel;
use Database\Factories\FirmaAnexoFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Firma sobre un anexo 02–07 (RF-004/005, B1). Polimórfica: apunta al
 * documento firmado (informe, acta, etc.). Varias firmas coexisten sobre un
 * mismo documento/versión sin perder las previas (RF-005). Cada una pertenece a
 * un lado (entidad o ETTE, D-05); la del lado ETTE guarda en qué calidad se hizo.
 *
 * @property LadoFirma $lado
 * @property ?CalidadEtte $en_calidad_de
 * @property ?string $motivo_suplencia
 * @property EstadoFirma $estado
 */
class FirmaAnexo extends BaseModel
{
    /** @use HasFactory<FirmaAnexoFactory> */
    use Auditable, HasFactory, SoftDeletes;

    protected $table = 'firmas_anexo';

    protected $fillable = [
        'proceso_transferencia_id',
        'dependencia_id',
        'firmable_type',
        'firmable_id',
        'version',
        'firmante_id',
        'firmante_nombre',
        'firmante_cargo',
        'lado',
        'en_calidad_de',
        'motivo_suplencia',
        'estado',
        'firmada_en',
        'hash_pdf',
        'resultado_verificacion',
        'nota',
        'firma_sesion_id',
    ];

    protected static function newFactory(): FirmaAnexoFactory
    {
        return FirmaAnexoFactory::new();
    }

    protected function casts(): array
    {
        return [
            'lado' => LadoFirma::class,
            'en_calidad_de' => CalidadEtte::class,
            'estado' => EstadoFirma::class,
            'version' => 'integer',
            'firmada_en' => 'datetime',
            'resultado_verificacion' => 'array',
        ];
    }

    /** @return MorphTo<Model, $this> */
    public function firmable(): MorphTo
    {
        return $this->morphTo();
    }

    /** @return BelongsTo<User, $this> */
    public function firmante(): BelongsTo
    {
        return $this->belongsTo(User::class, 'firmante_id');
    }

    public function sesion(): BelongsTo
    {
        return $this->belongsTo(FirmaSesion::class, 'firma_sesion_id');
    }

    /** Firmas efectivamente válidas (estado FIRMADA). @param Builder<static> $query */
    public function scopeValidas(Builder $query): Builder
    {
        return $query->where('estado', EstadoFirma::FIRMADA->value);
    }
}

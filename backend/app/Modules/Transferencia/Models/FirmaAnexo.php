<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Models;

use App\Models\User;
use App\Support\Concerns\Auditable;
use App\Support\Enums\CaracterFirma;
use App\Support\Enums\EstadoFirma;
use App\Support\Models\BaseModel;
use Database\Factories\FirmaAnexoFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Firma digital sobre un anexo 02–07 (RF-004/005, B1). Polimórfica: apunta al
 * documento firmado (informe, acta, etc.). Varias firmas coexisten sobre un
 * mismo documento/versión sin perder las previas (RF-005).
 *
 * @property CaracterFirma $caracter
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
        'caracter',
        'estado',
        'firmada_en',
        'hash_pdf',
        'resultado_verificacion',
        'nota',
        'copia_entregada_en',
        'copia_registrada_por_id',
        'firma_sesion_id',
    ];

    protected static function newFactory(): FirmaAnexoFactory
    {
        return FirmaAnexoFactory::new();
    }

    protected function casts(): array
    {
        return [
            'caracter' => CaracterFirma::class,
            'estado' => EstadoFirma::class,
            'version' => 'integer',
            'firmada_en' => 'datetime',
            'resultado_verificacion' => 'array',
            'copia_entregada_en' => 'datetime',
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

    /** Quién registró la entrega de la copia digital (B2, D-12). @return BelongsTo<User, $this> */
    public function copiaRegistradaPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'copia_registrada_por_id');
    }

    /** Firmas obligatorias cuya ausencia bloquea la entrega (C-08). @param Builder<static> $query */
    public function scopeObligatorias(Builder $query): Builder
    {
        return $query->where('caracter', CaracterFirma::OBLIGATORIA->value);
    }

    /** Firmas efectivamente válidas (estado FIRMADA). @param Builder<static> $query */
    public function scopeValidas(Builder $query): Builder
    {
        return $query->where('estado', EstadoFirma::FIRMADA->value);
    }

    /** Constancias de ausencia de firma ETTE (opcional + estado AUSENTE), B2/D-12. @param Builder<static> $query */
    public function scopeAusentesEtte(Builder $query): Builder
    {
        return $query->where('caracter', CaracterFirma::OPCIONAL->value)
            ->where('estado', EstadoFirma::AUSENTE->value);
    }
}

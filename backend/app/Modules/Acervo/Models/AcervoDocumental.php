<?php

declare(strict_types=1);

namespace App\Modules\Acervo\Models;

use App\Models\User;
use App\Modules\Organization\Models\Dependencia;
use App\Support\Concerns\Auditable;
use App\Support\Concerns\HasFuenteDato;
use App\Support\Concerns\TieneEvidencias;
use App\Support\Concerns\TieneObservaciones;
use App\Support\Enums\FuenteDato;
use App\Support\Enums\TipoAcervo;
use App\Support\Models\BaseModel;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Serie del acervo documentario. Las físicas (Anexo 03-A) las registra a mano
 * el centro de costo, medidas en folios; las digitales (Anexo 03-B) se
 * precargan del SGD (tipo documental + emitidos/recibidos), medidas en número
 * de documentos. Cada fila es de un año.
 *
 * @property TipoAcervo $tipo
 */
class AcervoDocumental extends BaseModel
{
    use Auditable, HasFuenteDato, SoftDeletes, TieneEvidencias, TieneObservaciones;

    protected $table = 'acervo_documental';

    public const UNIDAD_ARCHIVO_DIGITAL = 'Archivo Digital';

    protected $fillable = [
        'proceso_transferencia_id',
        'dependencia_id',
        'registrado_por_id',
        'tipo',
        'serie_documental',
        'anio',
        'folios',
        'numero_documentos',
        'unidad_conservacion',
        'ubicacion',
        'fuente',
        'fuente_referencia',
        'extraido_en',
    ];

    protected function casts(): array
    {
        return [
            'anio' => 'integer',
            'folios' => 'integer',
            'numero_documentos' => 'integer',
            'tipo' => TipoAcervo::class,
        ];
    }

    /** @return Attribute<string|null, never> */
    protected function ubicacion(): Attribute
    {
        return Attribute::make(
            get: fn (?string $valor): ?string => blank($valor) && $this->fuente === FuenteDato::SGD
                ? 'Sistema de Gestión Documental (SGD)'
                : $valor,
        );
    }

    /** @return BelongsTo<Dependencia, $this> */
    public function dependencia(): BelongsTo
    {
        return $this->belongsTo(Dependencia::class);
    }

    /** @return BelongsTo<User, $this> */
    public function registradoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'registrado_por_id');
    }

    /** @param  Builder<static>  $query */
    public function scopeDelTipo(Builder $query, TipoAcervo $tipo): Builder
    {
        return $query->where('tipo', $tipo->value);
    }
}

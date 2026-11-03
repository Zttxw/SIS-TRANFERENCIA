<?php

declare(strict_types=1);

namespace App\Modules\Patrimonio\Models;

use App\Modules\Organization\Models\Dependencia;
use App\Modules\Organization\Models\Servidor;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Concerns\Auditable;
use App\Support\Concerns\HasFuenteDato;
use App\Support\Concerns\TieneEvidencias;
use App\Support\Concerns\TieneObservaciones;
use App\Support\Enums\FuenteDato;
use App\Support\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Bien patrimonial importado del SIGA (Anexo 04).
 *
 * @property string $codigo_patrimonial
 * @property string $denominacion
 */
class BienPatrimonial extends BaseModel
{
    use Auditable, HasFuenteDato, SoftDeletes, TieneEvidencias, TieneObservaciones;

    protected $table = 'bienes_patrimoniales';

    protected FuenteDato $fuentePorDefecto = FuenteDato::SIGA;

    protected $fillable = [
        'proceso_transferencia_id',
        'dependencia_id',
        'servidor_id',
        'codigo_patrimonial',
        'denominacion',
        'descripcion',
        'marca',
        'modelo',
        'serie',
        'estado_siga',
        'valor',
        'fuente',
        'fuente_referencia',
        'extraido_en',
    ];

    protected function casts(): array
    {
        return [
            'valor' => 'decimal:2',
        ];
    }

    /** @return BelongsTo<Dependencia, $this> */
    public function dependencia(): BelongsTo
    {
        return $this->belongsTo(Dependencia::class);
    }

    /** @return BelongsTo<Servidor, $this> */
    public function servidor(): BelongsTo
    {
        return $this->belongsTo(Servidor::class);
    }

    /** @return BelongsTo<ProcesoTransferencia, $this> */
    public function proceso(): BelongsTo
    {
        return $this->belongsTo(ProcesoTransferencia::class, 'proceso_transferencia_id');
    }

    /** @return HasOne<VerificacionBien, $this> */
    public function verificacion(): HasOne
    {
        return $this->hasOne(VerificacionBien::class);
    }
}

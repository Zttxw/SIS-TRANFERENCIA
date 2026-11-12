<?php

declare(strict_types=1);

namespace App\Modules\Documentos\Models;

use App\Modules\Organization\Models\Dependencia;
use App\Modules\Organization\Models\Servidor;
use App\Support\Concerns\Auditable;
use App\Support\Concerns\HasFuenteDato;
use App\Support\Concerns\TieneObservaciones;
use App\Support\Enums\FuenteDato;
use App\Support\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Documento pendiente de atención (plan §7.7).
 *
 * @property string $asunto
 */
class DocumentoPendiente extends BaseModel
{
    use Auditable, HasFuenteDato, SoftDeletes, TieneObservaciones;

    protected $table = 'documentos_pendientes';

    protected FuenteDato $fuentePorDefecto = FuenteDato::SGD;

    protected $fillable = [
        'proceso_transferencia_id',
        'dependencia_id',
        'servidor_responsable_id',
        'numero_documento',
        'tipo_documento',
        'asunto',
        'sumilla',
        'justificacion_pendiente',
        'fecha_documento',
        'estado_atencion',
        'accion_pendiente',
        'observaciones',
        'fuente',
        'fuente_referencia',
        'extraido_en',
    ];

    protected function casts(): array
    {
        return [
            'fecha_documento' => 'date',
        ];
    }

    /** @return BelongsTo<Dependencia, $this> */
    public function dependencia(): BelongsTo
    {
        return $this->belongsTo(Dependencia::class);
    }

    /** @return BelongsTo<Servidor, $this> */
    public function responsable(): BelongsTo
    {
        return $this->belongsTo(Servidor::class, 'servidor_responsable_id');
    }
}

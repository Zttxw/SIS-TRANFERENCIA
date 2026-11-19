<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Models;

use App\Models\User;
use App\Modules\Expediente\Models\Expediente;
use App\Modules\Organization\Models\Dependencia;
use App\Support\Concerns\Auditable;
use App\Support\Concerns\TieneEvidencias;
use App\Support\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Acta de transferencia (Anexo 07). `anexos_entregados` guarda la condición de
 * cada ítem de la sección III (CondicionesActa).
 *
 * @property ?array<string, mixed> $intervinientes
 * @property ?array<string, array{condicion: string, observacion: ?string, manual: bool}> $anexos_entregados
 * @property ?string $hora
 * @property int $version
 */
class ActaTransferencia extends BaseModel
{
    use Auditable, SoftDeletes, TieneEvidencias;

    protected $table = 'actas_transferencia';

    protected $fillable = [
        'proceso_transferencia_id',
        'dependencia_id',
        'expediente_id',
        'numero_acta',
        'fecha_acta',
        'lugar',
        'hora',
        'intervinientes',
        'anexos_entregados',
        'otros_documentos',
        'observaciones',
        'estado',
        'version',
        'ruta_pdf',
        'ruta_pdf_suscrito',
        'generada_por_id',
    ];

    protected function casts(): array
    {
        return [
            'fecha_acta' => 'date:Y-m-d',
            'intervinientes' => 'array',
            'anexos_entregados' => 'array',
            'version' => 'integer',
        ];
    }

    /** @return BelongsTo<Dependencia, $this> */
    public function dependencia(): BelongsTo
    {
        return $this->belongsTo(Dependencia::class);
    }

    /** @return BelongsTo<Expediente, $this> */
    public function expediente(): BelongsTo
    {
        return $this->belongsTo(Expediente::class);
    }

    /** @return BelongsTo<User, $this> */
    public function generadaPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'generada_por_id');
    }
}

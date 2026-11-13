<?php

declare(strict_types=1);

namespace App\Modules\Gestion\Models;

use App\Models\User;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Organization\Models\Servidor;
use App\Support\Concerns\Auditable;
use App\Support\Concerns\TieneEvidencias;
use App\Support\Concerns\TieneObservaciones;
use App\Support\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Informe de gestión por centro de costo (Anexo 02).
 */
class InformeGestion extends BaseModel
{
    use Auditable, SoftDeletes, TieneEvidencias, TieneObservaciones;

    protected $table = 'informes_gestion';

    protected $fillable = [
        'proceso_transferencia_id',
        'dependencia_id',
        'servidor_responsable_id',
        'elaborado_por_id',
        'nivel_organizacional',
        'cargo_periodo',
        'responsable_nombre',
        'cargo_responsable',
        'periodo_gestion',
        'funciones',
        'logros_items',
        'dificultades_items',
        'pendientes_items',
        'estado',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'funciones' => 'array',
            'logros_items' => 'array',
            'dificultades_items' => 'array',
            'pendientes_items' => 'array',
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

    /** @return BelongsTo<User, $this> */
    public function elaboradoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'elaborado_por_id');
    }
}

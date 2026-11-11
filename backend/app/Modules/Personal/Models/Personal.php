<?php

declare(strict_types=1);

namespace App\Modules\Personal\Models;

use App\Models\User;
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
 * Registro de personal por dependencia (Anexo 05).
 *
 * @property bool $validado
 */
class Personal extends BaseModel
{
    use Auditable, HasFuenteDato, SoftDeletes, TieneObservaciones;

    protected $table = 'personal';

    protected FuenteDato $fuentePorDefecto = FuenteDato::SGD;

    protected $fillable = [
        'proceso_transferencia_id',
        'dependencia_id',
        'servidor_id',
        'dni',
        'nombres',
        'apellidos',
        'cargo',
        'regimen_laboral',
        'modalidad_contractual',
        'situacion_laboral',
        'observaciones',
        'validado',
        'validado_por_id',
        'fuente',
        'fuente_referencia',
        'extraido_en',
    ];

    protected function casts(): array
    {
        return [
            'validado' => 'boolean',
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

    /** @return BelongsTo<User, $this> */
    public function validadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'validado_por_id');
    }
}

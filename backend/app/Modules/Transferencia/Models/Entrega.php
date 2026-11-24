<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Models;

use App\Models\User;
use App\Modules\Organization\Models\Dependencia;
use App\Support\Concerns\Auditable;
use App\Support\Enums\EstadoEntrega;
use App\Support\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Entrega de un centro de costo en el proceso (plan §3.1): una por CC y proceso.
 * Registra el cierre para revisión y firma, el titular ETTE designado si suple
 * al coordinador (`titular_suplente_id`, con motivo), la remisión al CC padre o
 * al ETTS y, para las que llegan al ETTS, la cadena institucional ETTS → ETTE
 * (D-12). `receptor_id`, `revisada_en` y `consolidada_en` son historial de
 * solo lectura del flujo anterior.
 *
 * @property EstadoEntrega $estado
 */
class Entrega extends BaseModel
{
    use Auditable, SoftDeletes;

    protected $table = 'entregas';

    protected $fillable = [
        'proceso_transferencia_id',
        'dependencia_id',
        'dependencia_destino_id',
        'emisor_id',
        'estado',
        'presentada_en',
        'presentada_por_id',
        'titular_suplente_id',
        'motivo_suplencia_ette',
        'remitida_en',
        'comentario',
        'hijos_pendientes_al_remitir',
        'recibida_etts_en',
        'recibida_etts_por_id',
        'envio_ette_id',
        'remitida_ette_en',
        'remitida_ette_por_id',
        'recibida_ette_en',
        'recibida_ette_por_id',
    ];

    protected function casts(): array
    {
        return [
            'estado' => EstadoEntrega::class,
            'presentada_en' => 'datetime',
            'remitida_en' => 'datetime',
            'recibida_etts_en' => 'datetime',
            'remitida_ette_en' => 'datetime',
            'recibida_ette_en' => 'datetime',
            'hijos_pendientes_al_remitir' => 'array',
            'revisada_en' => 'datetime',
            'consolidada_en' => 'datetime',
        ];
    }

    /** @return BelongsTo<Dependencia, $this> */
    public function dependencia(): BelongsTo
    {
        return $this->belongsTo(Dependencia::class);
    }

    /** @return BelongsTo<Dependencia, $this> */
    public function dependenciaDestino(): BelongsTo
    {
        return $this->belongsTo(Dependencia::class, 'dependencia_destino_id');
    }

    /** @return BelongsTo<User, $this> */
    public function emisor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'emisor_id');
    }

    /** @return BelongsTo<User, $this> */
    public function presentadaPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'presentada_por_id');
    }

    /** @return BelongsTo<User, $this> */
    public function titularSuplente(): BelongsTo
    {
        return $this->belongsTo(User::class, 'titular_suplente_id');
    }

    /** @return BelongsTo<User, $this> */
    public function recibidaEttsPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recibida_etts_por_id');
    }

    /** @return BelongsTo<EnvioEtte, $this> */
    public function envioEtte(): BelongsTo
    {
        return $this->belongsTo(EnvioEtte::class, 'envio_ette_id');
    }

    /** @return BelongsTo<User, $this> */
    public function recibidaEttePor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recibida_ette_por_id');
    }

    public function esModificable(): bool
    {
        return $this->estado->admiteEdicion();
    }

    /**
     * ¿La entrega se remite al ETTS institucional? Ocurre cuando el CC no tiene
     * padre en el Anexo 01 (su padre es él mismo): su destino es el ETTS.
     */
    public function esHaciaEtts(): bool
    {
        return $this->dependencia_destino_id === null;
    }
}

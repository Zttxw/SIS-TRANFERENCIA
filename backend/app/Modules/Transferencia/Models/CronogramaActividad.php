<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Models;

use App\Modules\Organization\Models\Dependencia;
use App\Support\Concerns\Auditable;
use App\Support\Enums\EstadoActividadCronograma;
use App\Support\Models\BaseModel;
use Database\Factories\CronogramaActividadFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * Actividad/etapa del cronograma del proceso (RF-007, C-03). Su vencimiento
 * bloquea la operación indicada (C2). El estado administrativo (pendiente/en
 * curso/completada) es independiente de la vigencia temporal: una actividad
 * puede estar vencida y aún no completada.
 *
 * @property EstadoActividadCronograma $estado
 * @property ?Carbon $fecha_vencimiento
 */
class CronogramaActividad extends BaseModel
{
    /** @use HasFactory<CronogramaActividadFactory> */
    use Auditable, HasFactory, SoftDeletes;

    /**
     * Zona horaria del corte de plazo. El vencimiento se interpreta en hora de
     * Lima aunque la aplicación persista en UTC (config/app.php: 'UTC'). D-03.
     */
    public const ZONA_PLAZO = 'America/Lima';

    protected $table = 'cronograma_actividades';

    protected $appends = ['vencida'];

    public function getVencidaAttribute(): bool
    {
        return $this->estaVencida();
    }

    protected $fillable = [
        'proceso_transferencia_id',
        'dependencia_id',
        'etapa',
        'nombre',
        'descripcion',
        'fecha_inicio',
        'fecha_vencimiento',
        'hora_vencimiento',
        'estado',
        'operacion',
        'orden',
    ];

    protected static function newFactory(): CronogramaActividadFactory
    {
        return CronogramaActividadFactory::new();
    }

    protected function casts(): array
    {
        return [
            'estado' => EstadoActividadCronograma::class,
            'fecha_inicio' => 'date',
            'fecha_vencimiento' => 'date',
            'hora_vencimiento' => 'string',
            'orden' => 'integer',
        ];
    }

    /** @return BelongsTo<Dependencia, $this> */
    public function dependencia(): BelongsTo
    {
        return $this->belongsTo(Dependencia::class);
    }

    /**
     * Instante exacto en que vence el plazo, en zona America/Lima (D-03). Con
     * `hora_vencimiento` vence a esa hora de Lima; sin ella, al terminar el día
     * de Lima. null cuando no hay fecha de vencimiento (no hay plazo que vencer).
     */
    public function instanteVencimiento(): ?Carbon
    {
        if ($this->fecha_vencimiento === null) {
            return null;
        }

        // `fecha_vencimiento` es un cast 'date' (medianoche); se toma solo el día
        // y se ancla en la zona de Lima, sin arrastrar la hora/zona del cast.
        $dia = $this->fecha_vencimiento->format('Y-m-d');

        if ($this->hora_vencimiento === null) {
            return Carbon::parse($dia, self::ZONA_PLAZO)->endOfDay();
        }

        $hora = substr((string) $this->hora_vencimiento, 0, 8); // H:i:s

        return Carbon::parse($dia.' '.$hora, self::ZONA_PLAZO);
    }

    /**
     * ¿La actividad está vencida en la fecha de referencia? Una actividad
     * completada no se considera vencida (ya se cumplió). Sin fecha de
     * vencimiento no hay plazo que vencer. El corte se evalúa en hora de Lima.
     */
    public function estaVencida(?Carbon $referencia = null): bool
    {
        if ($this->estado?->estaCompletada()) {
            return false;
        }

        $vencimiento = $this->instanteVencimiento();

        if ($vencimiento === null) {
            return false;
        }

        $referencia = $referencia ?? Carbon::now();

        return $referencia->greaterThan($vencimiento);
    }

    /** Actividades que gobiernan una operación dada (p. ej. 'remision'). @param Builder<static> $query */
    public function scopeParaOperacion(Builder $query, string $operacion): Builder
    {
        return $query->where('operacion', $operacion);
    }

    /**
     * Actividades aplicables a una dependencia: las generales del proceso
     * (dependencia_id NULL) y las específicas de esa dependencia.
     *
     * @param  Builder<static>  $query
     */
    public function scopeAplicablesA(Builder $query, int $dependenciaId): Builder
    {
        return $query->where(function (Builder $q) use ($dependenciaId) {
            $q->whereNull('dependencia_id')->orWhere('dependencia_id', $dependenciaId);
        });
    }
}

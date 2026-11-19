<?php

declare(strict_types=1);

namespace App\Modules\Organization\Models;

use App\Models\User;
use App\Support\Concerns\Auditable;
use App\Support\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Vincula una dependencia del SGD o un centro de costo del SIGA con un centro
 * de costo del Anexo 01 (D-11). La relación se define a mano, por nombre: no
 * hay un código común entre los sistemas. `codigo_origen` solo identifica la
 * fila dentro de su propio sistema.
 *
 * @property int $id
 * @property int $proceso_transferencia_id
 * @property string $origen
 * @property string $codigo_origen
 * @property ?string $nombre_origen
 * @property ?int $dependencia_origen_id
 * @property ?int $centro_costo_id
 * @property bool $es_principal
 * @property ?int $confirmada_por_id
 * @property ?Carbon $confirmada_en
 */
class EquivalenciaCentroCosto extends BaseModel
{
    use Auditable;

    public const ORIGEN_SGD = 'sgd';

    public const ORIGEN_SIGA = 'siga';

    protected $table = 'equivalencias_centro_costo';

    protected $fillable = [
        'proceso_transferencia_id',
        'origen',
        'codigo_origen',
        'nombre_origen',
        'dependencia_origen_id',
        'centro_costo_id',
        'es_principal',
        'confirmada_por_id',
        'confirmada_en',
    ];

    protected function casts(): array
    {
        return [
            'es_principal' => 'boolean',
            'confirmada_en' => 'datetime',
        ];
    }

    /** @return BelongsTo<Dependencia, $this> */
    public function centroCosto(): BelongsTo
    {
        return $this->belongsTo(Dependencia::class, 'centro_costo_id');
    }

    /** @return BelongsTo<Dependencia, $this> */
    public function dependenciaOrigen(): BelongsTo
    {
        return $this->belongsTo(Dependencia::class, 'dependencia_origen_id');
    }

    /** @return BelongsTo<User, $this> */
    public function confirmadaPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmada_por_id');
    }
}

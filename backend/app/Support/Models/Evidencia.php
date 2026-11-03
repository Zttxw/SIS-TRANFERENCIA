<?php

declare(strict_types=1);

namespace App\Support\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * Archivo de evidencia adjunto a cualquier registro (polimórfico).
 *
 * @property string $ruta
 * @property string $disco
 */
class Evidencia extends BaseModel
{
    protected $table = 'evidencias';

    protected $fillable = [
        'evidenciable_type',
        'evidenciable_id',
        'subido_por_id',
        'nombre_original',
        'disco',
        'ruta',
        'mime_type',
        'tamano_bytes',
        'hash',
        'descripcion',
    ];

    /** @return MorphTo<Model, $this> */
    public function evidenciable(): MorphTo
    {
        return $this->morphTo();
    }

    /** @return BelongsTo<User, $this> */
    public function subidoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'subido_por_id');
    }
}

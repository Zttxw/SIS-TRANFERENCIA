<?php

declare(strict_types=1);

namespace App\Support\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Modelo base del dominio. Centraliza convenciones comunes a todos los
 * modelos del sistema para evitar repetición entre módulos.
 */
abstract class BaseModel extends Model
{
    /**
     * Desactiva la asignación masiva "guarded" global: cada modelo declara
     * explícitamente su $fillable, evitando sobre-exposición accidental.
     */
    protected $guarded = ['id'];
}

<?php

declare(strict_types=1);

namespace App\Support\Http;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Form Request base para la escritura de anexos acotados a una dependencia
 * (plan §5, F8-ámbito). Centraliza la autorización por ámbito: un usuario solo
 * puede registrar/editar anexos de una dependencia dentro de su alcance
 * (propia o, para consolidadores, su subárbol). Admin/ETTS/ETTE no se acotan.
 *
 * Las subclases declaran únicamente sus `rules()`; no deben sobrescribir
 * `authorize()` salvo que necesiten una condición adicional (en cuyo caso deben
 * combinarla con `autorizaAmbito()`).
 */
abstract class AnexoFormRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->autorizaAmbito();
    }

    /**
     * ¿El usuario puede escribir sobre la `dependencia_id` del payload? Si la
     * petición no trae `dependencia_id` (p. ej. update por id), se difiere al
     * service/controller y aquí se concede.
     */
    protected function autorizaAmbito(): bool
    {
        $dependenciaId = $this->input('dependencia_id');

        if ($dependenciaId === null) {
            return true;
        }

        /** @var User|null $usuario */
        $usuario = $this->user();

        return $usuario !== null
            && $usuario->puedeAccederDependencia((int) $dependenciaId);
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Requests;

use App\Modules\Transferencia\Services\ObservacionService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validación del registro de una observación. La autorización por ámbito se
 * verifica en el controller contra la dependencia del observable (no hay
 * `dependencia_id` en el payload, viene del elemento observado).
 */
class RegistrarObservacionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'anexo' => ['required', 'string', Rule::in(array_keys(ObservacionService::anexosObservables()))],
            'observable_id' => ['required', 'integer', 'min:1'],
            'descripcion' => ['required', 'string', 'min:5'],
        ];
    }
}

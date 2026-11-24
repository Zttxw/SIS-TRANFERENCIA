<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Requests;

use App\Modules\Transferencia\Services\ObservacionService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validación del registro de una observación. Se observa una fila del anexo
 * (`observable_id`) o el anexo completo de un CC (`dependencia_id`). El ámbito
 * y que quien la registra sea el responsable del CC se verifican en el
 * controller; el autor es el firmante ETTE designado.
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
            'observable_id' => ['nullable', 'integer', 'min:1', 'required_without:dependencia_id'],
            'dependencia_id' => ['nullable', 'integer', 'required_without:observable_id', 'exists:dependencias,id,es_centro_costo,1'],
            'descripcion' => ['required', 'string', 'min:5'],
        ];
    }
}

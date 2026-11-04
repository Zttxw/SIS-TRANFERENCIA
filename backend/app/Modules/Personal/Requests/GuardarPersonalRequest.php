<?php

declare(strict_types=1);

namespace App\Modules\Personal\Requests;

use Illuminate\Foundation\Http\FormRequest;

class GuardarPersonalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'dependencia_id' => ['required', 'integer', 'exists:dependencias,id'],
            'servidor_id' => ['nullable', 'integer', 'exists:servidores,id'],
            'dni' => ['required', 'string', 'regex:/^[0-9]{8}$/'],
            'nombres' => ['required', 'string', 'max:150'],
            'apellidos' => ['required', 'string', 'max:150'],
            'cargo' => ['required', 'string', 'max:150'],
            'regimen_laboral' => ['required', 'string', 'max:100'],
            'modalidad_contractual' => ['nullable', 'string', 'max:100'],
            'situacion_laboral' => ['nullable', 'string', 'max:100'],
            'validado' => ['nullable', 'boolean'],
        ];
    }
}

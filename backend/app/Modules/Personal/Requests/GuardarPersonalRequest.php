<?php

declare(strict_types=1);

namespace App\Modules\Personal\Requests;

use App\Support\Http\AnexoFormRequest;

class GuardarPersonalRequest extends AnexoFormRequest
{
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
            'observaciones' => ['nullable', 'string', 'max:1000'],
            'validado' => ['nullable', 'boolean'],
        ];
    }
}

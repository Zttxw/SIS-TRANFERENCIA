<?php

declare(strict_types=1);

namespace App\Modules\Patrimonio\Requests;

use App\Support\Enums\EstadoConservacion;
use App\Support\Enums\EstadoVerificacionBien;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;

class VerificarBienRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'estado' => ['required', new Enum(EstadoVerificacionBien::class)],
            'estado_conservacion' => ['nullable', new Enum(EstadoConservacion::class)],
            'observacion' => [
                Rule::requiredIf(function () {
                    $estado = $this->input('estado');

                    return in_array($estado, [
                        EstadoVerificacionBien::NO_UBICADO->value,
                        EstadoVerificacionBien::CON_OBSERVACION->value,
                    ], true);
                }),
                'nullable',
                'string',
                'max:1000',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'observacion.required' => 'La observación es obligatoria cuando el bien es marcado como "No ubicado" o "Con observación" (RN-05).',
        ];
    }
}

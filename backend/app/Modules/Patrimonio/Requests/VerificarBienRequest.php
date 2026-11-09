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

            // Campos de la plantilla Anexo 04 que el servidor completa al verificar
            // (el SIGA no siempre los trae). Todos opcionales.
            'color' => ['nullable', 'string', 'max:100'],
            'dimension' => ['nullable', 'string', 'max:150'],
            'caracteristicas' => ['nullable', 'string', 'max:1000'],
            'codigo_patrimonial_anterior' => ['nullable', 'string', 'max:100'],
            'ubicacion' => ['nullable', 'string', 'max:255'],

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

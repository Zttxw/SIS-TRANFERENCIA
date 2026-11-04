<?php

declare(strict_types=1);

namespace App\Modules\NoPatrimonial\Requests;

use App\Support\Enums\EstadoConservacion;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

class GuardarBienNoPatrimonialRequest extends FormRequest
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
            'denominacion' => ['required', 'string', 'max:255'],
            'descripcion' => ['nullable', 'string'],
            'cantidad' => ['required', 'numeric', 'min:0.01'],
            'unidad_medida' => ['required', 'string', 'max:50'],
            'estado_conservacion' => ['nullable', new Enum(EstadoConservacion::class)],
            'ubicacion' => ['nullable', 'string', 'max:255'],
            'observaciones' => ['nullable', 'string'],
        ];
    }
}

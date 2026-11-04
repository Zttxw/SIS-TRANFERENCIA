<?php

declare(strict_types=1);

namespace App\Modules\Acervo\Requests;

use Illuminate\Foundation\Http\FormRequest;

class GuardarAcervoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'dependencia_id' => ['required', 'integer', 'exists:dependencias,id'],
            'tipo' => ['required', 'string', 'in:fisico,digital'],
            'serie_documental' => ['required', 'string', 'max:255'],
            'periodo' => ['nullable', 'string', 'max:100'],
            'cantidad_unidades' => ['required', 'integer', 'min:1'],
            'unidad_conservacion' => ['required', 'string', 'max:100'],
            'ubicacion' => ['nullable', 'string', 'max:255'],
            'descripcion' => ['nullable', 'string'],
            'observaciones' => ['nullable', 'string'],
        ];
    }
}

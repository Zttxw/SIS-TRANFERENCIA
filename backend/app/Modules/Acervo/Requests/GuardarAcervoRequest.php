<?php

declare(strict_types=1);

namespace App\Modules\Acervo\Requests;

use App\Support\Http\AnexoFormRequest;

class GuardarAcervoRequest extends AnexoFormRequest
{
    public function rules(): array
    {
        return [
            'dependencia_id' => ['required', 'integer', 'exists:dependencias,id'],
            'tipo' => ['required', 'string', 'in:fisico,digital'],
            'serie_documental' => ['required', 'string', 'max:255'],
            'anio' => ['nullable', 'integer', 'min:1990', 'max:2100'],
            'desde_anio' => ['nullable', 'integer', 'min:1990', 'max:2100'],
            'hasta_anio' => ['nullable', 'integer', 'min:1990', 'max:2100', 'gte:desde_anio'],
            'periodo' => ['nullable', 'string', 'max:100'],
            'cantidad_unidades' => ['required', 'integer', 'min:1'],
            'unidad_conservacion' => ['required', 'string', 'max:100'],
            'ubicacion' => ['nullable', 'string', 'max:255'],
            'descripcion' => ['nullable', 'string'],
            'observaciones' => ['nullable', 'string'],
        ];
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\Acervo\Requests;

use App\Support\Http\AnexoFormRequest;

/**
 * Serie física (sección B del Anexo 03). Las series digitales de la sección A
 * se precargan del SGD y no se registran por esta vía.
 */
class GuardarAcervoRequest extends AnexoFormRequest
{
    public function rules(): array
    {
        return [
            'dependencia_id' => ['required', 'integer', 'exists:dependencias,id,es_centro_costo,1'],
            'serie_documental' => ['required', 'string', 'max:255'],
            'anio' => ['required', 'integer', 'min:1990', 'max:2100'],
            'folios' => ['required', 'integer', 'min:1', 'max:2147483647'],
            'unidad_conservacion' => ['required', 'string', 'max:100'],
            'ubicacion' => ['required', 'string', 'max:255'],
        ];
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SubsanarObservacionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'respuesta' => ['required', 'string', 'min:5'],
        ];
    }
}

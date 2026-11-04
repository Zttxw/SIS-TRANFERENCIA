<?php

declare(strict_types=1);

namespace App\Modules\Gestion\Requests;

use Illuminate\Foundation\Http\FormRequest;

class GuardarInformeGestionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'dependencia_id' => ['required', 'integer', 'exists:dependencias,id'],
            'servidor_responsable_id' => ['nullable', 'integer', 'exists:servidores,id'],
            'principales_funciones' => ['required', 'string', 'min:10'],
            'logros' => ['required', 'string', 'min:10'],
            'dificultades' => ['nullable', 'string'],
            'asuntos_pendientes' => ['nullable', 'string'],
            'estado' => ['nullable', 'string', 'in:borrador,completado'],
        ];
    }
}

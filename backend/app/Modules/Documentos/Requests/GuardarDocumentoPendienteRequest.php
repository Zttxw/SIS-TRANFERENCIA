<?php

declare(strict_types=1);

namespace App\Modules\Documentos\Requests;

use App\Support\Http\AnexoFormRequest;

class GuardarDocumentoPendienteRequest extends AnexoFormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'dependencia_id' => ['required', 'integer', 'exists:dependencias,id'],
            'servidor_responsable_id' => ['nullable', 'integer', 'exists:servidores,id'],
            'numero_documento' => ['nullable', 'string', 'max:255'],
            'tipo_documento' => ['nullable', 'string', 'max:100'],
            'asunto' => ['required', 'string'],
            'fecha_documento' => ['nullable', 'date'],
            'estado_atencion' => ['nullable', 'string', 'max:100'],
            'accion_pendiente' => ['nullable', 'string'],
            'observaciones' => ['nullable', 'string'],
        ];
    }
}

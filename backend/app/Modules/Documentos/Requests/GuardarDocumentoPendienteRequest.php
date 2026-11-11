<?php

declare(strict_types=1);

namespace App\Modules\Documentos\Requests;

use App\Modules\Documentos\Models\DocumentoPendiente;
use App\Support\Enums\FuenteDato;
use App\Support\Http\AnexoFormRequest;

class GuardarDocumentoPendienteRequest extends AnexoFormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        // E1/D-04: la justificación de pendiente es obligatoria en complementos
        // (fuente != sgd) y opcional en registros ingeridos del SGD. El CRUD crea
        // siempre `manual` (complemento); al editar, manda la fuente del registro.
        $justificacion = $this->esComplemento()
            ? ['required', 'string']
            : ['nullable', 'string'];

        return [
            'dependencia_id' => ['required', 'integer', 'exists:dependencias,id'],
            'servidor_responsable_id' => ['nullable', 'integer', 'exists:servidores,id'],
            'numero_documento' => ['nullable', 'string', 'max:255'],
            'tipo_documento' => ['nullable', 'string', 'max:100'],
            'asunto' => ['required', 'string'],
            'sumilla' => ['nullable', 'string'],
            'justificacion_pendiente' => $justificacion,
            'fecha_documento' => ['nullable', 'date'],
            'estado_atencion' => ['nullable', 'string', 'max:100'],
            'accion_pendiente' => ['nullable', 'string'],
            'observaciones' => ['nullable', 'string'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'justificacion_pendiente.required' => 'Debe justificar por qué el documento está pendiente (una fecha posterior al corte no lo implica por sí sola).',
        ];
    }

    /**
     * ¿El documento es una declaración complementaria (fuente != sgd)? Un alta
     * por el CRUD lo es siempre; una edición lo determina por el registro
     * existente (los ingeridos del SGD no exigen justificación).
     */
    private function esComplemento(): bool
    {
        $id = $this->route('id');

        if ($id === null) {
            return true; // alta ⇒ fuente manual ⇒ complemento.
        }

        // Nota: Eloquent::value() aplica el cast, por lo que `fuente` llega como
        // enum FuenteDato (no string). Un registro inexistente se trata como
        // complemento (conservador: exige justificación).
        $documento = DocumentoPendiente::whereKey($id)->first();

        return $documento === null || $documento->fuente !== FuenteDato::SGD;
    }
}

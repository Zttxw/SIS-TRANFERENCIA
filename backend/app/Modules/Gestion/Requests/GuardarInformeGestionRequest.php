<?php

declare(strict_types=1);

namespace App\Modules\Gestion\Requests;

use App\Support\Http\AnexoFormRequest;

/**
 * Anexo 02 — Informe de Gestión. El formato oficial define cada sección como
 * una tabla de filas repetibles; se validan como arrays de objetos (jsonb).
 */
class GuardarInformeGestionRequest extends AnexoFormRequest
{
    public function rules(): array
    {
        return [
            'dependencia_id' => ['required', 'integer', 'exists:dependencias,id'],
            'servidor_responsable_id' => ['nullable', 'integer', 'exists:servidores,id'],
            'nivel_organizacional' => ['nullable', 'string', 'in:primer_nivel,segundo_nivel,tercer_nivel,equipo_trabajo'],
            'cargo_periodo' => ['nullable', 'string', 'max:255'],
            'responsable_nombre' => ['nullable', 'string', 'max:255'],
            'cargo_responsable' => ['nullable', 'string', 'max:255'],
            'periodo_gestion' => ['nullable', 'string', 'max:100'],

            // Sección I — Funciones principales (al menos una fila).
            'funciones' => ['required', 'array', 'min:1'],
            'funciones.*.descripcion' => ['required', 'string', 'min:3'],

            // Sección II — Logros y resultados (al menos una fila).
            'logros_items' => ['required', 'array', 'min:1'],
            'logros_items.*.actividad' => ['required', 'string', 'min:3'],
            'logros_items.*.resultado' => ['nullable', 'string'],
            'logros_items.*.indicador' => ['nullable', 'string'],
            'logros_items.*.verificacion' => ['nullable', 'string'],

            // Sección III — Dificultades afrontadas (opcional).
            'dificultades_items' => ['nullable', 'array'],
            'dificultades_items.*.dificultad' => ['required_with:dificultades_items', 'string', 'min:3'],
            'dificultades_items.*.efecto' => ['nullable', 'string'],
            'dificultades_items.*.medida' => ['nullable', 'string'],

            // Sección IV — Agenda pendiente (opcional).
            'pendientes_items' => ['nullable', 'array'],
            'pendientes_items.*.asunto' => ['required_with:pendientes_items', 'string', 'min:3'],
            'pendientes_items.*.estado_accion' => ['nullable', 'string'],
            'pendientes_items.*.documento_referencia' => ['nullable', 'string'],
            'pendientes_items.*.plazo' => ['nullable', 'string'],
            'pendientes_items.*.responsable' => ['nullable', 'string'],

            'estado' => ['nullable', 'string', 'in:borrador,completado'],
        ];
    }
}

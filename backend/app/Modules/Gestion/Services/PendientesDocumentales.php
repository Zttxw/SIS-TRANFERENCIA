<?php

declare(strict_types=1);

namespace App\Modules\Gestion\Services;

use App\Modules\Documentos\Models\DocumentoPendiente;
use App\Modules\Organization\Models\EstadoSgd;
use App\Support\Enums\FuenteDato;
use Illuminate\Support\Collection;

/**
 * Lee en vivo los documentos pendientes de un CC (los ingeridos del SGD y los
 * registrados a mano) y los convierte en filas de la sección IV del Anexo 02
 * (D-09), con las mismas columnas que la entrada libre del informe.
 */
class PendientesDocumentales
{
    /**
     * @return list<array{asunto: string, estado_accion: string, documento_referencia: string, plazo: string, responsable: string, origen: string}>
     */
    public function filas(int $dependenciaId, int $procesoId): array
    {
        $estadosSgd = EstadoSgd::query()->recepcion()->pluck('descripcion', 'codigo');

        return DocumentoPendiente::query()
            ->with(['dependencia:id,nombre', 'responsable:id,nombres,apellidos'])
            ->where('proceso_transferencia_id', $procesoId)
            ->where('dependencia_id', $dependenciaId)
            ->orderByRaw('fecha_documento IS NULL')
            ->orderBy('fecha_documento')
            ->orderBy('id')
            ->get()
            ->map(fn (DocumentoPendiente $documento): array => $this->fila($documento, $estadosSgd))
            ->values()
            ->all();
    }

    /**
     * Correspondencia de columnas: asunto ← sumilla (si se registró) o asunto;
     * estado y acción ← estado del SGD, justificación y acción pendiente;
     * documento ← tipo y número; fecha ← fecha del documento (el SGD no tiene
     * plazo); unidad ← CC de destino y, si se conoce, el servidor de destino.
     *
     * @param  Collection<string, string>  $estadosSgd
     * @return array{asunto: string, estado_accion: string, documento_referencia: string, plazo: string, responsable: string, origen: string}
     */
    private function fila(DocumentoPendiente $documento, Collection $estadosSgd): array
    {
        $esSgd = $documento->fuente === FuenteDato::SGD;
        $servidor = $documento->responsable
            ? trim("{$documento->responsable->nombres} {$documento->responsable->apellidos}")
            : null;

        return [
            'asunto' => $this->texto($documento->sumilla) ?? $documento->asunto,
            'estado_accion' => $this->estadoYAccion($documento, $esSgd ? $estadosSgd : null),
            'documento_referencia' => $this->unir(' ', [$documento->tipo_documento, $documento->numero_documento]),
            'plazo' => $documento->fecha_documento ? 'Doc. del '.$documento->fecha_documento->format('d/m/Y') : '',
            'responsable' => $this->unir(' — ', [$documento->dependencia?->nombre, $servidor]),
            'origen' => $esSgd ? 'sgd' : 'manual',
        ];
    }

    /** @param  Collection<string, string>|null  $estadosSgd */
    private function estadoYAccion(DocumentoPendiente $documento, ?Collection $estadosSgd): string
    {
        $partes = [
            $this->estado($documento->estado_atencion, $estadosSgd),
            $this->conEtiqueta('Justificación', $documento->justificacion_pendiente),
            $this->conEtiqueta('Acción', $documento->accion_pendiente),
        ];

        return $this->unir('. ', array_map(fn (?string $parte): ?string => $parte === null ? null : rtrim($parte, '. '), $partes));
    }

    /** @param  Collection<string, string>|null  $estadosSgd */
    private function estado(?string $codigo, ?Collection $estadosSgd): string
    {
        $codigo = $this->texto($codigo);
        if ($codigo === null || $codigo === 'SIN ESTADO') {
            return 'Sin estado informado';
        }

        return $estadosSgd?->get($codigo) ?? $codigo;
    }

    private function conEtiqueta(string $etiqueta, ?string $valor): ?string
    {
        $valor = $this->texto($valor);

        return $valor === null ? null : "{$etiqueta}: {$valor}";
    }

    /** @param  list<?string>  $partes */
    private function unir(string $separador, array $partes): string
    {
        return implode($separador, array_filter(array_map($this->texto(...), $partes)));
    }

    private function texto(?string $valor): ?string
    {
        $valor = trim((string) $valor);

        return $valor === '' ? null : $valor;
    }
}

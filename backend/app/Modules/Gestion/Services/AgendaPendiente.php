<?php

declare(strict_types=1);

namespace App\Modules\Gestion\Services;

use App\Modules\Gestion\Models\InformeGestion;

/**
 * Sección IV del Anexo 02 (agenda pendiente, D-09): combina la entrada libre del
 * informe con los documentos pendientes del CC. Usa la copia congelada al
 * presentar la entrega; mientras no exista, lee los documentos en vivo. Con el
 * módulo de documentos pendientes apagado, solo queda la entrada libre.
 */
class AgendaPendiente
{
    public function __construct(
        private readonly PendientesDocumentales $pendientes,
    ) {}

    /**
     * Filas de la sección IV numeradas de forma correlativa: primero la entrada
     * libre y luego los documentos pendientes. Cada fila indica su origen.
     *
     * @return list<array<string, mixed>>
     */
    public function filas(InformeGestion $informe): array
    {
        $manuales = array_map(
            fn (array $fila): array => [...$fila, 'origen' => 'manual'],
            $informe->pendientes_items ?? [],
        );

        $filas = [];
        foreach ([...$manuales, ...$this->documentales($informe)] as $indice => $fila) {
            $filas[] = [...$fila, 'n' => $indice + 1];
        }

        return $filas;
    }

    /**
     * Documentos pendientes del CC: la copia congelada al presentar o, antes de
     * presentar, la lectura en vivo.
     *
     * @return list<array<string, mixed>>
     */
    public function documentales(InformeGestion $informe): array
    {
        if (! config('modulos.documentos_pendientes')) {
            return [];
        }

        if ($informe->pendientes_congelados_en !== null) {
            return $informe->pendientes_documentales ?? [];
        }

        return $this->pendientes->filas((int) $informe->dependencia_id, (int) $informe->proceso_transferencia_id);
    }
}

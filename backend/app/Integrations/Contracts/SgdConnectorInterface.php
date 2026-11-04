<?php

declare(strict_types=1);

namespace App\Integrations\Contracts;

use Illuminate\Support\Collection;

/**
 * Contrato de integración con el Sistema de Gestión Documentaria (SGD).
 * Diseñado para ser implementado por el módulo SGD sin interferir con SIGA.
 */
interface SgdConnectorInterface
{
    /**
     * Obtiene el organigrama / dependencias vigentes registradas en el SGD.
     */
    public function obtenerEstructuraOrganizacional(): Collection;

    /**
     * Obtiene los servidores públicos registrados en el SGD para una dependencia.
     */
    public function obtenerServidoresPorDependencia(string $codigoDependencia): Collection;

    /**
     * Obtiene los documentos pendientes de atención (7.7 de la Directiva).
     */
    public function obtenerDocumentosPendientes(string $codigoDependencia): Collection;
}

<?php

declare(strict_types=1);

namespace App\Integrations\Contracts;

use App\Integrations\DTOs\SigaBienDTO;
use Illuminate\Support\Collection;

/**
 * Contrato de integración con el Sistema Integrado de Gestión Administrativa (SIGA-MEF).
 * Exclusivamente de SOLO LECTURA (RN-06).
 */
interface SigaConnectorInterface
{
    /**
     * Obtiene el listado de bienes patrimoniales asignados a un centro de costo.
     *
     * @return Collection<int, SigaBienDTO>
     */
    public function obtenerBienesPorCentroCosto(string $codigoCentroCosto): Collection;

    /**
     * Obtiene el listado de bienes asignados a un responsable específico (por DNI/código).
     *
     * @return Collection<int, SigaBienDTO>
     */
    public function obtenerBienesPorResponsable(string $dniResponsable): Collection;

    /**
     * Obtiene los centros de costo registrados en el SIGA.
     *
     * @return Collection<int, array{codigo: string, nombre: string, sede: ?string}>
     */
    public function obtenerCentrosCosto(): Collection;
}

<?php

declare(strict_types=1);

namespace App\Integrations\Siga;

use App\Integrations\Contracts\SigaConnectorInterface;
use App\Integrations\DTOs\SigaBienDTO;
use Illuminate\Database\ConnectionInterface;
use Illuminate\Database\DatabaseManager;
use Illuminate\Support\Collection;

/**
 * Conector oficial de lectura para el módulo de Patrimonio del SIGA-MEF.
 * Utiliza las tablas oficiales identificadas en exportar_anexo04:
 * SIG_PATRIMONIO, SIG_CENTRO_COSTO, MARCA, SIG_PERSONAL, SIG_UBICAC_FISICA.
 */
class SigaPatrimonioConnector implements SigaConnectorInterface
{
    protected ConnectionInterface $db;

    public function __construct(DatabaseManager $dbManager)
    {
        $this->db = $dbManager->connection('siga');
    }

    /**
     * Obtiene los bienes patrimoniales vigentes de un centro de costo con
     * los nombres de marca, responsable y dependencia resueltos.
     *
     * @return Collection<int, SigaBienDTO>
     */
    public function obtenerBienesPorCentroCosto(string $codigoCentroCosto): Collection
    {
        $records = $this->db->select("
            SELECT 
                p.CODIGO_ACTIVO as CODIGO_PATRIMONIAL,
                p.DESCRIPCION,
                m.NOMBRE as MARCA,
                p.MODELO,
                p.NRO_SERIE as SERIE,
                p.CARACTERISTICAS as COLOR,
                p.ESTADO_CONSERV,
                p.VALOR_INICIAL as VALOR_ADQ,
                p.CENTRO_COSTO,
                cc.NOMBRE_DEPEND,
                p.EMPLEADO,
                per.nombre_completo as RESPONSABLE,
                p.ESTADO_ACTUAL
            FROM SIG_PATRIMONIO p
            LEFT JOIN SIG_CENTRO_COSTO cc ON p.CENTRO_COSTO = cc.CENTRO_COSTO
            LEFT JOIN MARCA m ON p.MARCA = m.MARCA
            LEFT JOIN SIG_PERSONAL per ON p.EMPLEADO = per.empleado
            WHERE p.CENTRO_COSTO = ?
              AND (p.ESTADO_ACTUAL <> 'N' OR p.ESTADO_ACTUAL IS NULL)
            ORDER BY p.CODIGO_ACTIVO
        ", [$codigoCentroCosto]);

        return collect($records)->map(fn ($r) => SigaBienDTO::fromSigaRecord($r));
    }

    /**
     * Obtiene los bienes asignados a un responsable por su DNI / código de empleado.
     *
     * @return Collection<int, SigaBienDTO>
     */
    public function obtenerBienesPorResponsable(string $dniResponsable): Collection
    {
        $records = $this->db->select("
            SELECT 
                p.CODIGO_ACTIVO as CODIGO_PATRIMONIAL,
                p.DESCRIPCION,
                m.NOMBRE as MARCA,
                p.MODELO,
                p.NRO_SERIE as SERIE,
                p.CARACTERISTICAS as COLOR,
                p.ESTADO_CONSERV,
                p.VALOR_INICIAL as VALOR_ADQ,
                p.CENTRO_COSTO,
                cc.NOMBRE_DEPEND,
                p.EMPLEADO,
                per.nombre_completo as RESPONSABLE,
                p.ESTADO_ACTUAL
            FROM SIG_PATRIMONIO p
            LEFT JOIN SIG_CENTRO_COSTO cc ON p.CENTRO_COSTO = cc.CENTRO_COSTO
            LEFT JOIN MARCA m ON p.MARCA = m.MARCA
            LEFT JOIN SIG_PERSONAL per ON p.EMPLEADO = per.empleado
            WHERE p.EMPLEADO = ?
              AND (p.ESTADO_ACTUAL <> 'N' OR p.ESTADO_ACTUAL IS NULL)
            ORDER BY p.CODIGO_ACTIVO
        ", [$dniResponsable]);

        return collect($records)->map(fn ($r) => SigaBienDTO::fromSigaRecord($r));
    }

    /**
     * Obtiene los centros de costo registrados y activos en el SIGA.
     *
     * @return Collection<int, array{codigo: string, nombre: string, sede: ?string}>
     */
    public function obtenerCentrosCosto(): Collection
    {
        $records = $this->db->select("
            SELECT 
                CENTRO_COSTO as codigo,
                NOMBRE_DEPEND as nombre,
                SEDE as sede
            FROM SIG_CENTRO_COSTO
            WHERE ESTADO = 'A'
            ORDER BY CENTRO_COSTO
        ");

        return collect($records)->map(fn ($r) => [
            'codigo' => (string)$r->codigo,
            'nombre' => trim((string)$r->nombre),
            'sede' => isset($r->sede) ? (string)$r->sede : null,
        ]);
    }
}

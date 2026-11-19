<?php

declare(strict_types=1);

namespace App\Modules\Patrimonio\Services;

use App\Integrations\Contracts\SigaConnectorInterface;
use App\Integrations\DTOs\SigaBienDTO;
use App\Integrations\Siga\SigaPatrimonioConnector;
use App\Modules\Organization\Models\EquivalenciaCentroCosto;
use App\Modules\Organization\Models\Servidor;
use App\Modules\Organization\Services\EquivalenciasCentroCosto;
use App\Modules\Patrimonio\Models\BienPatrimonial;
use App\Modules\Patrimonio\Models\VerificacionBien;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\EstadoVerificacionBien;
use App\Support\Enums\FuenteDato;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Servicio de Ingesta Patrimonial desde el SIGA-MEF hacia PostgreSQL (Anexo 04).
 * Soporta conexión MSSQL oficial y réplica SQLite de contingencia / desarrollo.
 */
class IngestaPatrimonioSiga
{
    public function __construct(
        protected SigaConnectorInterface $sigaConnector,
    ) {}

    /**
     * Ejecuta la ingesta patrimonial para un proceso de transferencia.
     *
     * @param  string|null  $codigoCentroCosto  filtro por centro de costo (ej: 01.03.07.04 para OTI)
     * @param  bool  $usarSqlite  usar réplica SQLite local
     * @return array{dependencias: int, servidores: int, bienes: int, valor_total: float}
     */
    public function ejecutar(ProcesoTransferencia $proceso, ?string $codigoCentroCosto = null, bool $usarSqlite = false): array
    {
        if ($usarSqlite && $this->sigaConnector instanceof SigaPatrimonioConnector) {
            $this->sigaConnector->usarConexion('siga_sqlite');
        }

        $extraidoEn = Carbon::now();

        // 1. Obtener los centros de costo del SIGA y resolver a qué centro de
        //    costo del Anexo 01 pertenece cada uno (D-11). La equivalencia se
        //    define a mano, por nombre, en la tabla de equivalencias: no hay un
        //    código común entre el SIGA y el Anexo 01. Un centro de costo del
        //    SIGA que aún no está en la tabla se registra «sin asignar».
        $equivalencias = app(EquivalenciasCentroCosto::class);
        $centrosCosto = $this->sigaConnector->obtenerCentrosCosto();
        foreach ($centrosCosto as $cc) {
            $equivalencias->registrarOrigen(
                $proceso->id, EquivalenciaCentroCosto::ORIGEN_SIGA, trim($cc['codigo']), trim((string) ($cc['nombre'] ?? '')) ?: null,
            );
        }
        $mapaDependencias = $equivalencias->mapa($proceso->id, EquivalenciaCentroCosto::ORIGEN_SIGA);

        // 2. Obtener los bienes a ingestar
        $bienes = $codigoCentroCosto !== null
            ? $this->sigaConnector->obtenerBienesPorCentroCosto($codigoCentroCosto)
            : $this->obtenerTodosLosBienesActivos($centrosCosto);

        $contadorBienes = 0;
        $valorTotal = 0.0;
        $mapaServidores = [];

        // 3. Persistir en lotes dentro de una transacción
        DB::transaction(function () use (
            $proceso,
            $bienes,
            $mapaDependencias,
            &$mapaServidores,
            &$contadorBienes,
            &$valorTotal,
            $extraidoEn
        ) {
            foreach ($bienes as $item) {
                /** @var SigaBienDTO $item */
                $codigoCentroCosto = trim((string) $item->codigoCentroCosto);
                $depId = $mapaDependencias[$codigoCentroCosto] ?? null;
                if ($depId === null) {
                    throw new RuntimeException("El bien {$item->codigoPatrimonial} pertenece al centro de costo SIGA {$codigoCentroCosto}, que no tiene equivalencia con un CC del Anexo 01.");
                }

                // Sincronizar servidor responsable si tiene DNI
                $servidorId = null;
                if (! empty($item->dniResponsable)) {
                    $dni = trim($item->dniResponsable);
                    if (! isset($mapaServidores[$dni])) {
                        $partes = explode(' ', trim($item->nombreResponsable ?? ''));
                        $apellidos = count($partes) >= 2 ? $partes[0].' '.$partes[1] : ($partes[0] ?? null);
                        $nombres = count($partes) >= 3 ? implode(' ', array_slice($partes, 2)) : ($item->nombreResponsable ?? 'Servidor');

                        $servidor = Servidor::withTrashed()->firstOrNew([
                            'proceso_transferencia_id' => $proceso->id,
                            'dni' => $dni,
                        ]);

                        if (! $servidor->exists || $servidor->fuente === FuenteDato::SIGA) {
                            $servidor->fill([
                                'nombres' => $nombres,
                                'apellidos' => $apellidos,
                                'dependencia_id' => null,
                                'fuente' => FuenteDato::SIGA->value,
                                'extraido_en' => $extraidoEn,
                            ]);
                            $servidor->save();
                        }
                        if ($servidor->trashed()) {
                            $servidor->restore();
                        }
                        $mapaServidores[$dni] = $servidor->id;
                    }
                    $servidorId = $mapaServidores[$dni];
                }

                // Guardar o actualizar Bien Patrimonial
                $bien = BienPatrimonial::withTrashed()->updateOrCreate(
                    [
                        'proceso_transferencia_id' => $proceso->id,
                        'codigo_patrimonial' => $item->codigoPatrimonial,
                    ],
                    [
                        'dependencia_id' => $depId,
                        'servidor_id' => $servidorId,
                        'denominacion' => $item->descripcion,
                        'descripcion' => $item->descripcion,
                        'marca' => $item->marca,
                        'modelo' => $item->modelo,
                        'serie' => $item->serie,
                        'estado_siga' => $item->estadoConservacion,
                        'valor' => $item->valorAdquisicion,
                        'fuente' => FuenteDato::SIGA->value,
                        'fuente_referencia' => "SIG_PATRIMONIO.CODIGO_ACTIVO={$item->codigoPatrimonial};CENTRO_COSTO={$codigoCentroCosto}",
                        'extraido_en' => $extraidoEn,
                    ]
                );
                if ($bien->trashed()) {
                    $bien->restore();
                }

                // Inicializar estado de verificación en PENDIENTE si no existe
                VerificacionBien::firstOrCreate(
                    [
                        'bien_patrimonial_id' => $bien->id,
                    ],
                    [
                        'estado' => EstadoVerificacionBien::PENDIENTE,
                        'estado_conservacion' => null,
                    ]
                );

                $contadorBienes++;
                $valorTotal += (float) ($item->valorAdquisicion ?? 0.0);
            }
        });

        return [
            'dependencias' => count($mapaDependencias),
            'servidores' => count($mapaServidores),
            'bienes' => $contadorBienes,
            'valor_total' => $valorTotal,
        ];
    }

    /**
     * Helper para iterar centros de costo cuando se pide ingesta global.
     */
    protected function obtenerTodosLosBienesActivos($centrosCosto)
    {
        $coleccion = collect();
        foreach ($centrosCosto as $cc) {
            $bienesCc = $this->sigaConnector->obtenerBienesPorCentroCosto($cc['codigo']);
            $coleccion = $coleccion->concat($bienesCc);
        }

        return $coleccion;
    }
}

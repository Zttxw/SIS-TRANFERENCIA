<?php

declare(strict_types=1);

namespace App\Modules\Patrimonio\Services;

use App\Integrations\Contracts\SigaConnectorInterface;
use App\Integrations\DTOs\SigaBienDTO;
use App\Integrations\Siga\SigaPatrimonioConnector;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Organization\Models\Servidor;
use App\Modules\Patrimonio\Models\BienPatrimonial;
use App\Modules\Patrimonio\Models\VerificacionBien;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\EstadoVerificacionBien;
use App\Support\Enums\FuenteDato;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

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

        // 1. Obtener centros de costo y resolver a qué dependencia pertenece cada uno.
        //
        // El SIGA y el SGD usan llaves de código distintas para la misma unidad
        // (SGD: ID interno "00025"; SIGA: jerárquico "01.03.07.04"). El empate se
        // materializa en `dependencias.codigo_siga` (MapeoDependenciasSigaSeeder).
        // Por eso NO creamos una dependencia por centro de costo: buscamos la
        // dependencia maestra (SGD) cuyo `codigo_siga` coincide y colgamos de ella
        // los bienes. Solo si no hay empate creamos una dependencia propia marcada
        // como SIGA (centro de costo sin equivalente en el SGD).
        $centrosCosto = $this->sigaConnector->obtenerCentrosCosto();
        $mapaDependencias = [];

        $dependenciasPorCodigoSiga = Dependencia::withTrashed()
            ->where('proceso_transferencia_id', $proceso->id)
            ->whereNotNull('codigo_siga')
            ->pluck('id', 'codigo_siga');

        DB::transaction(function () use ($proceso, $centrosCosto, $dependenciasPorCodigoSiga, &$mapaDependencias, $extraidoEn) {
            foreach ($centrosCosto as $cc) {
                $codigoSiga = $cc['codigo'];

                // a) Empate con la dependencia maestra del SGD por codigo_siga.
                if ($dependenciasPorCodigoSiga->has($codigoSiga)) {
                    $mapaDependencias[$codigoSiga] = $dependenciasPorCodigoSiga->get($codigoSiga);

                    continue;
                }

                // b) Sin equivalente en el SGD: crear/actualizar dependencia propia
                //    SIGA (identificada por su código de centro de costo).
                $dep = Dependencia::withTrashed()->updateOrCreate(
                    [
                        'proceso_transferencia_id' => $proceso->id,
                        'codigo' => $codigoSiga,
                    ],
                    [
                        'codigo_siga' => $codigoSiga,
                        'nombre' => $cc['nombre'] ?: "Centro de Costo {$codigoSiga}",
                        'nivel' => 2,
                        'activa' => true,
                        'fuente' => FuenteDato::SIGA->value,
                        'extraido_en' => $extraidoEn,
                    ]
                );
                if ($dep->trashed()) {
                    $dep->restore();
                }
                $mapaDependencias[$codigoSiga] = $dep->id;
            }
        });

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
                $depId = $item->codigoCentroCosto ? ($mapaDependencias[$item->codigoCentroCosto] ?? null) : null;

                // Sincronizar servidor responsable si tiene DNI
                $servidorId = null;
                if (! empty($item->dniResponsable)) {
                    $dni = trim($item->dniResponsable);
                    if (! isset($mapaServidores[$dni])) {
                        $partes = explode(' ', trim($item->nombreResponsable ?? ''));
                        $apellidos = count($partes) >= 2 ? $partes[0].' '.$partes[1] : ($partes[0] ?? null);
                        $nombres = count($partes) >= 3 ? implode(' ', array_slice($partes, 2)) : ($item->nombreResponsable ?? 'Servidor');

                        $servidor = Servidor::withTrashed()->updateOrCreate(
                            [
                                'proceso_transferencia_id' => $proceso->id,
                                'dni' => $dni,
                            ],
                            [
                                'nombres' => $nombres,
                                'apellidos' => $apellidos,
                                'dependencia_id' => $depId,
                                'fuente' => FuenteDato::SIGA->value,
                                'extraido_en' => $extraidoEn,
                            ]
                        );
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

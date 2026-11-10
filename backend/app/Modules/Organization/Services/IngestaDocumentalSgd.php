<?php

declare(strict_types=1);

namespace App\Modules\Organization\Services;

use App\Modules\Acervo\Models\AcervoDocumental;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Organization\Models\TipoDocumentalSgd;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\FuenteDato;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Ingesta documental de SOLO LECTURA del SGD hacia las tablas de trabajo
 * (plan §7.3 Acervo digital y §7.7 Documentos pendientes). Enfoque de AGREGADO
 * DIRECTO: no se copia el bruto del SGD; las consultas agregan/filtran en SQL
 * Server y solo se materializa lo relevante por dependencia (RN-03, RN-06).
 *
 * Volumen de origen (verificado): ~198k documentos y ~233k destinos solo de 2026.
 * Por eso toda consulta agrupa o filtra en el servidor, nunca trae el detalle
 * completo a PHP, y se acota por año de proceso.
 *
 * Reglas institucionales de "pendiente" (diccionario R01–R12 del SGD):
 * - R01: unir remito y destino por (NU_ANN, NU_EMI).
 * - R02: destino vigente ES_ELI='0'.
 * - R03: emisión del remito NOT IN ('5','7','8','9') (proyecto/despacho/observado/anulado).
 * - "Pendiente": el estado de recepción vive en TDTV_DESTINOS.ES_DOC_REC (verificado
 *   en vivo; ES_DES es siempre '0' y no sirve). Pende si NO está resuelto, es decir
 *   ES_DOC_REC NOT IN ('2','3','4','5','9') = atendido/archivado/derivado/enviado/anulado.
 *   Los no leídos ('0') y recibidos sin atender ('1') sí penden.
 */
class IngestaDocumentalSgd
{
    public function __construct(
        private readonly string $esquema,
        private readonly string $conexionSgd = 'sgd',
    ) {}

    public static function desdeConfig(): self
    {
        return new self(
            esquema: (string) config('sgd.schema', 'IDOSGD'),
            conexionSgd: (string) config('sgd.connection', 'sgd'),
        );
    }

    /**
     * Ejecuta la ingesta documental para un proceso. El año se toma del proceso
     * (fecha de corte) y acota TODAS las consultas al SGD.
     *
     * @param  string|null  $soloDependencia  limita a una dependencia (piloto)
     * @return array{anio: string, acervo: int}
     */
    public function ejecutar(ProcesoTransferencia $proceso, ?string $soloDependencia = null): array
    {
        $anio = $this->anioProceso($proceso);
        $extraidoEn = Carbon::now();

        $acervo = $this->ingestarAcervoDigital($proceso, $anio, $soloDependencia, $extraidoEn);

        return ['anio' => $anio, 'acervo' => $acervo];
    }

    /**
     * Acervo digital (Anexo 03): una fila-resumen por dependencia emisora y tipo
     * documental, con el conteo de documentos emitidos en el año. Agregado en SQL
     * Server con GROUP BY; no trae documentos individuales.
     */
    private function ingestarAcervoDigital(
        ProcesoTransferencia $proceso,
        string $anio,
        ?string $soloDependencia,
        Carbon $extraidoEn,
    ): int {
        $sql = "SELECT r.CO_DEP_EMI AS dep, r.CO_TIP_DOC_ADM AS tipo, COUNT(*) AS total
                FROM {$this->esquema}.TDTV_REMITOS r
                WHERE r.NU_ANN = ?
                  AND r.ES_ELI = '0'
                  AND r.ES_DOC_EMI NOT IN ('9')
                  AND r.CO_DEP_EMI IS NOT NULL";
        $bindings = [$anio];
        if ($soloDependencia !== null) {
            $sql .= ' AND r.CO_DEP_EMI = ?';
            $bindings[] = $soloDependencia;
        }
        $sql .= ' GROUP BY r.CO_DEP_EMI, r.CO_TIP_DOC_ADM';

        $filas = DB::connection($this->conexionSgd)->select($sql, $bindings);

        $depPorCodigo = $this->dependenciasPorCodigo($proceso);
        $tiposPorCodigo = TipoDocumentalSgd::query()->pluck('descripcion', 'codigo');

        return DB::transaction(function () use ($filas, $proceso, $anio, $depPorCodigo, $tiposPorCodigo, $extraidoEn) {
            $total = 0;
            foreach ($filas as $fila) {
                $depCodigo = $this->texto($fila->dep);
                $dependenciaId = $depCodigo !== null ? ($depPorCodigo[$depCodigo] ?? null) : null;
                if ($dependenciaId === null) {
                    continue; // Dependencia fuera del proceso; se omite (incidencia silenciosa).
                }

                $tipoCodigo = $this->texto($fila->tipo);
                $serie = $tipoCodigo !== null
                    ? (($tiposPorCodigo[$tipoCodigo] ?? "Tipo {$tipoCodigo}"))
                    : 'Sin tipo documental';

                AcervoDocumental::updateOrCreate(
                    [
                        'proceso_transferencia_id' => $proceso->id,
                        'dependencia_id' => $dependenciaId,
                        'tipo' => AcervoDocumental::TIPO_DIGITAL,
                        'serie_documental' => $serie,
                        'periodo' => $anio,
                    ],
                    [
                        'cantidad_unidades' => (int) $fila->total,
                        'unidad_conservacion' => 'documento digital (SGD)',
                        'descripcion' => "Documentos emitidos en {$anio} de tipo «{$serie}», según el SGD.",
                        'fuente' => FuenteDato::SGD->value,
                        'fuente_referencia' => "TDTV_REMITOS CO_DEP_EMI={$depCodigo} CO_TIP_DOC_ADM={$tipoCodigo} NU_ANN={$anio}",
                        'extraido_en' => $extraidoEn,
                    ],
                );
                $total++;
            }

            return $total;
        });
    }

    /** @return Collection<string, int> */
    private function dependenciasPorCodigo(ProcesoTransferencia $proceso)
    {
        return Dependencia::query()
            ->where('proceso_transferencia_id', $proceso->id)
            ->pluck('id', 'codigo');
    }

    /** Año del proceso (columna `anio`); el SGD guarda NU_ANN como texto de 4 dígitos. */
    private function anioProceso(ProcesoTransferencia $proceso): string
    {
        $anio = (int) $proceso->getAttribute('anio');

        return $anio > 0 ? (string) $anio : (string) now()->year;
    }

    private function texto(mixed $valor): ?string
    {
        if ($valor === null) {
            return null;
        }
        $texto = trim((string) $valor);

        return $texto === '' ? null : $texto;
    }
}

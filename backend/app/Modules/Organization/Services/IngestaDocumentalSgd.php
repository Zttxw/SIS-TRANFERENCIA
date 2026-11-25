<?php

declare(strict_types=1);

namespace App\Modules\Organization\Services;

use App\Modules\Acervo\Models\AcervoDocumental;
use App\Modules\Acervo\Services\AcervoReferenciaSgd;
use App\Modules\Documentos\Models\DocumentoPendiente;
use App\Modules\Organization\Models\Servidor;
use App\Modules\Organization\Models\TipoDocumentalSgd;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\FuenteDato;
use App\Support\Enums\TipoAcervo;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

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
    /** Estados de emisión del remito que lo sacan del universo (R03). */
    public const EMISION_EXCLUIDA = ['5', '7', '8', '9'];

    /**
     * Estados de recepción (TDTV_DESTINOS.ES_DOC_REC) que indican que el destino
     * ya salió de la bandeja: atendido (2), archivado (3), derivado (4), enviado
     * (5) o anulado (9). El resto (no leído '0', recibido '1') queda pendiente.
     */
    private const RECEPCION_RESUELTA = ['2', '3', '4', '5', '9'];

    /**
     * Estados de recepción que NO cuentan como documento recibido en el acervo:
     * no leído (0) y anulado (9).
     */
    public const RECEPCION_NO_RECIBIDA = ['0', '9'];

    /**
     * Tipos documentales del SGD (CO_TIP_DOC_ADM) que solo acompañan el trámite
     * y no forman parte del acervo documentario del Anexo 03-B: proveído (232)
     * y hoja de envío (304).
     */
    public const TIPOS_FUERA_DEL_ACERVO = ['232', '304'];

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
     * @param  string|null  $soloDependencia  limita al CC de esta dependencia del SGD (piloto)
     * @return array{anio: string, acervo: int, pendientes: int}
     */
    public function ejecutar(ProcesoTransferencia $proceso, ?string $soloDependencia = null): array
    {
        $anio = $this->anioProceso($proceso);
        $extraidoEn = Carbon::now();

        // En modo piloto se trae el centro de costo completo: todas las
        // dependencias del SGD que se graban en el mismo CC (D-11). Si no, el
        // resumen del CC quedaría con solo una parte de sus documentos.
        $codigos = $soloDependencia !== null
            ? app(EquivalenciasCentroCosto::class)->codigosSgdHermanos($proceso->id, $soloDependencia)
            : null;

        // El acervo digital abarca todos los años del SGD (histórico documental).
        $acervo = $this->ingestarAcervoDigital($proceso, $codigos, $extraidoEn);
        // Los pendientes sí se acotan al año del proceso: son la bandeja vigente.
        $pendientes = $this->ingestarDocumentosPendientes($proceso, $anio, $codigos, $extraidoEn);

        return ['anio' => $anio, 'acervo' => $acervo, 'pendientes' => $pendientes];
    }

    /**
     * Acervo digital (Anexo 03-B): una serie por centro de costo,
     * tipo documental, sentido (emitidos/recibidos) y AÑO, con su número de
     * documentos. Todo se agrega en SQL Server.
     *
     * Abarca todos los años del SGD (que arrancó en sep-2025), no solo el del
     * proceso. Si varias dependencias del SGD caen en el mismo CC, sus series se
     * suman en una sola fila. Las series del SGD que ya no aparecen se retiran.
     *
     * @param  list<string>|null  $codigos  dependencias del SGD (modo piloto)
     */
    private function ingestarAcervoDigital(
        ProcesoTransferencia $proceso,
        ?array $codigos,
        Carbon $extraidoEn,
    ): int {
        $depPorCodigo = $this->dependenciasPorCodigo($proceso);
        $tiposPorCodigo = TipoDocumentalSgd::query()->pluck('descripcion', 'codigo');

        /** @var array<string, array{dependencia_id: int, serie: string, anio: string, sentido: string, tipo: ?string, documentos: int, deps: list<string>}> $grupos */
        $grupos = [];
        $filasPorSentido = [
            AcervoReferenciaSgd::EMITIDOS => $this->seriesEmitidas($codigos),
            AcervoReferenciaSgd::RECIBIDOS => $this->seriesRecibidas($codigos),
        ];

        foreach ($filasPorSentido as $sentido => $filas) {
            foreach ($filas as $fila) {
                $depCodigo = $this->texto($fila->dep);
                $dependenciaId = $depCodigo !== null ? ($depPorCodigo[$depCodigo] ?? null) : null;
                $anioFila = $this->texto($fila->anio);
                if ($dependenciaId === null || $anioFila === null) {
                    continue; // Dependencia fuera del proceso; se omite (incidencia silenciosa).
                }

                $tipoCodigo = $this->texto($fila->tipo);
                $serie = $this->nombreSerie($tipoCodigo !== null ? ($tiposPorCodigo[$tipoCodigo] ?? "Tipo {$tipoCodigo}") : null, $sentido);

                $clave = "{$dependenciaId}|{$serie}|{$anioFila}";
                $grupos[$clave] ??= ['dependencia_id' => $dependenciaId, 'serie' => $serie, 'anio' => $anioFila, 'sentido' => $sentido, 'tipo' => $tipoCodigo, 'documentos' => 0, 'deps' => []];
                $grupos[$clave]['documentos'] += (int) $fila->documentos;
                $grupos[$clave]['deps'][] = $depCodigo;
            }
        }

        $dependenciasAlcanzadas = $codigos === null
            ? null
            : array_values(array_unique(array_filter(array_map(fn (string $codigo) => $depPorCodigo[$codigo] ?? null, $codigos))));

        return DB::transaction(function () use ($grupos, $proceso, $extraidoEn, $dependenciasAlcanzadas) {
            $vigentes = [];
            foreach ($grupos as $grupo) {
                $vigentes[] = AcervoDocumental::updateOrCreate(
                    [
                        'proceso_transferencia_id' => $proceso->id,
                        'dependencia_id' => $grupo['dependencia_id'],
                        'tipo' => TipoAcervo::DIGITAL->value,
                        'serie_documental' => $grupo['serie'],
                        'anio' => (int) $grupo['anio'],
                    ],
                    [
                        'numero_documentos' => $grupo['documentos'],
                        'unidad_conservacion' => AcervoDocumental::UNIDAD_ARCHIVO_DIGITAL,
                        'fuente' => FuenteDato::SGD->value,
                        'fuente_referencia' => AcervoReferenciaSgd::construir($grupo['sentido'], $grupo['deps'], $grupo['tipo'], $grupo['anio']),
                        'extraido_en' => $extraidoEn,
                    ],
                )->id;
            }

            AcervoDocumental::query()
                ->where('proceso_transferencia_id', $proceso->id)
                ->where('fuente', FuenteDato::SGD->value)
                ->when($dependenciasAlcanzadas !== null, fn ($q) => $q->whereIn('dependencia_id', $dependenciasAlcanzadas))
                ->whereNotIn('id', $vigentes)
                ->delete();

            return count($grupos);
        });
    }

    /**
     * Documentos emitidos por dependencia, tipo y año (sin anulados).
     *
     * @param  list<string>|null  $codigos
     * @return list<object>
     */
    private function seriesEmitidas(?array $codigos): array
    {
        $sql = "SELECT r.NU_ANN AS anio, r.CO_DEP_EMI AS dep, r.CO_TIP_DOC_ADM AS tipo, COUNT(*) AS documentos
                FROM {$this->esquema}.TDTV_REMITOS r
                WHERE r.ES_ELI = '0'
                  AND r.ES_DOC_EMI NOT IN ('9')
                  AND r.CO_DEP_EMI IS NOT NULL
                  AND r.NU_ANN IS NOT NULL
                  AND {$this->condicionTipoDelAcervo()}";
        $bindings = self::TIPOS_FUERA_DEL_ACERVO;
        if ($codigos !== null) {
            $sql .= ' AND r.CO_DEP_EMI IN ('.$this->marcadores($codigos).')';
            $bindings = array_merge($bindings, $codigos);
        }
        $sql .= ' GROUP BY r.NU_ANN, r.CO_DEP_EMI, r.CO_TIP_DOC_ADM';

        return DB::connection($this->conexionSgd)->select($sql, $bindings);
    }

    /**
     * Documentos recibidos por dependencia destino, tipo y año. Solo cuentan los
     * destinos ya leídos o atendidos (los no leídos van a Documentos pendientes)
     * y cada documento se cuenta una vez por dependencia aunque tenga copias.
     *
     * @param  list<string>|null  $codigos
     * @return list<object>
     */
    private function seriesRecibidas(?array $codigos): array
    {
        $emisionExcluida = $this->marcadores(self::EMISION_EXCLUIDA);
        $noRecibida = $this->marcadores(self::RECEPCION_NO_RECIBIDA);

        $sql = "SELECT DISTINCT d.NU_ANN AS anio, d.NU_EMI AS emi, d.CO_DEP_DES AS dep,
                       r.CO_TIP_DOC_ADM AS tipo
                FROM {$this->esquema}.TDTV_DESTINOS d
                INNER JOIN {$this->esquema}.TDTV_REMITOS r
                        ON r.NU_ANN = d.NU_ANN AND r.NU_EMI = d.NU_EMI
                WHERE d.ES_ELI = '0'
                  AND r.ES_ELI = '0'
                  AND r.ES_DOC_EMI NOT IN ({$emisionExcluida})
                  AND d.ES_DOC_REC IS NOT NULL
                  AND d.ES_DOC_REC NOT IN ({$noRecibida})
                  AND d.CO_DEP_DES IS NOT NULL
                  AND d.NU_ANN IS NOT NULL
                  AND {$this->condicionTipoDelAcervo()}";
        $bindings = array_merge(self::EMISION_EXCLUIDA, self::RECEPCION_NO_RECIBIDA, self::TIPOS_FUERA_DEL_ACERVO);
        if ($codigos !== null) {
            $sql .= ' AND d.CO_DEP_DES IN ('.$this->marcadores($codigos).')';
            $bindings = array_merge($bindings, $codigos);
        }

        return DB::connection($this->conexionSgd)->select(
            "SELECT x.anio, x.dep, x.tipo, COUNT(*) AS documentos
             FROM ({$sql}) x
             GROUP BY x.anio, x.dep, x.tipo",
            $bindings,
        );
    }

    /**
     * Condición sobre `TDTV_REMITOS r` que deja fuera los tipos ajenos al acervo.
     * Conserva los documentos sin tipo, que forman la serie «Documentos sin tipo».
     */
    private function condicionTipoDelAcervo(): string
    {
        return '(r.CO_TIP_DOC_ADM IS NULL OR r.CO_TIP_DOC_ADM NOT IN ('.$this->marcadores(self::TIPOS_FUERA_DEL_ACERVO).'))';
    }

    /** «Informe emitidos», «Memorándum recibidos»: tipo documental + sentido. */
    private function nombreSerie(?string $tipoDocumental, string $sentido): string
    {
        $tipo = $tipoDocumental !== null
            ? Str::ucfirst(Str::lower(trim($tipoDocumental)))
            : 'Documentos sin tipo';

        return "{$tipo} {$sentido}";
    }

    /**
     * Documentos pendientes (§7.7): destinos no atendidos dirigidos a cada
     * dependencia del proceso. Filtra en SQL Server por las reglas R01–R03 y por
     * estado de recepción no resuelto; trae solo las filas pendientes (acotadas).
     */
    /** @param  list<string>|null  $codigos  dependencias del SGD (modo piloto) */
    private function ingestarDocumentosPendientes(
        ProcesoTransferencia $proceso,
        string $anio,
        ?array $codigos,
        Carbon $extraidoEn,
    ): int {
        $emisionExcluida = $this->marcadores(self::EMISION_EXCLUIDA);
        $recepcionResuelta = $this->marcadores(self::RECEPCION_RESUELTA);

        $sql = "SELECT d.NU_ANN AS anio, d.NU_EMI AS emi, d.NU_DES AS des,
                       d.CO_DEP_DES AS dep_des, d.CO_EMP_DES AS emp_des,
                       d.ES_DOC_REC AS est_rec, d.CO_PRI AS prioridad, d.FE_DES AS fe_des,
                       r.DE_ASU AS asunto, r.NU_DOC_EMI AS nro_doc, r.CO_TIP_DOC_ADM AS tipo,
                       r.FE_EMI AS fe_emi
                FROM {$this->esquema}.TDTV_DESTINOS d
                INNER JOIN {$this->esquema}.TDTV_REMITOS r
                        ON r.NU_ANN = d.NU_ANN AND r.NU_EMI = d.NU_EMI
                WHERE d.NU_ANN = ?
                  AND d.ES_ELI = '0'
                  AND r.ES_ELI = '0'
                  AND r.ES_DOC_EMI NOT IN ({$emisionExcluida})
                  AND (d.ES_DOC_REC IS NULL OR d.ES_DOC_REC NOT IN ({$recepcionResuelta}))
                  AND d.CO_DEP_DES IS NOT NULL";
        $bindings = array_merge([$anio], self::EMISION_EXCLUIDA, self::RECEPCION_RESUELTA);
        if ($codigos !== null) {
            $sql .= ' AND d.CO_DEP_DES IN ('.$this->marcadores($codigos).')';
            $bindings = array_merge($bindings, $codigos);
        }

        $filas = DB::connection($this->conexionSgd)->select($sql, $bindings);

        $depPorCodigo = $this->dependenciasPorCodigo($proceso);
        $servidorPorCodigo = $this->servidoresPorCodigoSgd($proceso);
        $tiposPorCodigo = TipoDocumentalSgd::query()->pluck('descripcion', 'codigo');

        return DB::transaction(function () use (
            $filas, $proceso, $codigos, $depPorCodigo, $servidorPorCodigo, $tiposPorCodigo, $extraidoEn
        ) {
            /** @var array<int, true> $tocados ids que siguen pendientes en el SGD */
            $tocados = [];
            $total = 0;
            foreach ($filas as $fila) {
                $depCodigo = $this->texto($fila->dep_des);
                $dependenciaId = $depCodigo !== null ? ($depPorCodigo[$depCodigo] ?? null) : null;
                if ($dependenciaId === null) {
                    continue;
                }

                $empCodigo = $this->texto($fila->emp_des);
                $responsableId = $empCodigo !== null ? ($servidorPorCodigo[$empCodigo] ?? null) : null;

                $tipoCodigo = $this->texto($fila->tipo);
                $tipoDesc = $tipoCodigo !== null ? ($tiposPorCodigo[$tipoCodigo] ?? "Tipo {$tipoCodigo}") : null;

                $anio = $this->texto($fila->anio);
                $emi = $this->texto($fila->emi);
                $des = $this->texto($fila->des);

                $modelo = DocumentoPendiente::updateOrCreate(
                    [
                        'proceso_transferencia_id' => $proceso->id,
                        'fuente_referencia' => "TDTV_DESTINOS NU_ANN={$anio} NU_EMI={$emi} NU_DES={$des}",
                    ],
                    [
                        'dependencia_id' => $dependenciaId,
                        'servidor_responsable_id' => $responsableId,
                        'numero_documento' => $this->texto($fila->nro_doc),
                        'tipo_documento' => $tipoDesc,
                        'asunto' => (string) ($this->texto($fila->asunto) ?? 'Sin asunto registrado'),
                        'fecha_documento' => $this->fecha($fila->fe_emi),
                        'estado_atencion' => $this->texto($fila->est_rec),
                        'fuente' => FuenteDato::SGD->value,
                        'extraido_en' => $extraidoEn,
                    ],
                );
                $tocados[$modelo->id] = true;
                $total++;
            }

            $this->podarResueltos($proceso, $codigos, $depPorCodigo, array_keys($tocados));

            return $total;
        });
    }

    /**
     * Soft-delete de los pendientes de origen SGD que ya no vienen de la consulta
     * (se atendieron/derivaron en el SGD desde la última ingesta). Solo poda filas
     * de fuente SGD dentro del ámbito ejecutado; nunca toca los registros manuales.
     *
     * @param  list<string>|null  $codigos
     * @param  array<string, int>  $depPorCodigo
     * @param  array<int, int>  $idsVigentes
     */
    private function podarResueltos(
        ProcesoTransferencia $proceso,
        ?array $codigos,
        array $depPorCodigo,
        array $idsVigentes,
    ): void {
        $query = DocumentoPendiente::query()
            ->where('proceso_transferencia_id', $proceso->id)
            ->where('fuente', FuenteDato::SGD->value)
            ->whereNotIn('id', $idsVigentes ?: [0]);

        // Respetar el ámbito: en modo piloto, solo poda el CC ingerido.
        if ($codigos !== null) {
            $destinos = array_values(array_unique(array_filter(array_map(fn (string $codigo) => $depPorCodigo[$codigo] ?? null, $codigos))));
            if ($destinos === []) {
                return;
            }
            $query->whereIn('dependencia_id', $destinos);
        }

        $query->delete();
    }

    /**
     * Código del SGD → dependencia donde se graba (su centro de costo, o la
     * propia dependencia del SGD mientras no tenga equivalencia).
     *
     * @return array<string, int>
     */
    private function dependenciasPorCodigo(ProcesoTransferencia $proceso): array
    {
        return app(EquivalenciasCentroCosto::class)->destinosSgd($proceso->id);
    }

    /** @return Collection<string, int> */
    private function servidoresPorCodigoSgd(ProcesoTransferencia $proceso)
    {
        return Servidor::query()
            ->where('proceso_transferencia_id', $proceso->id)
            ->whereNotNull('codigo_sgd')
            ->pluck('id', 'codigo_sgd');
    }

    /** Año del proceso (columna `anio`); el SGD guarda NU_ANN como texto de 4 dígitos. */
    private function anioProceso(ProcesoTransferencia $proceso): string
    {
        $anio = (int) $proceso->getAttribute('anio');

        return $anio > 0 ? (string) $anio : (string) now()->year;
    }

    private function marcadores(array $valores): string
    {
        return implode(',', array_fill(0, count($valores), '?'));
    }

    private function fecha(mixed $valor): ?string
    {
        $texto = $this->texto($valor);
        if ($texto === null) {
            return null;
        }
        try {
            return Carbon::parse($texto)->toDateString();
        } catch (\Throwable) {
            return null;
        }
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

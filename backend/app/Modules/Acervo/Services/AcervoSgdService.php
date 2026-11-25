<?php

declare(strict_types=1);

namespace App\Modules\Acervo\Services;

use App\Modules\Acervo\Models\AcervoDocumental;
use App\Modules\Organization\Services\IngestaDocumentalSgd;
use App\Support\Http\ApiResponse;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Consulta en vivo (SOLO LECTURA) de los documentos individuales del SGD que
 * respaldan una serie digital del Anexo 03-B. La ingesta sólo
 * materializa el resumen por centro de costo + tipo + sentido + año (ver
 * {@see IngestaDocumentalSgd}); aquí se listan los documentos uno a uno y se
 * sirve el PDF principal por streaming desde {@code TDTV_ARCHIVO_DOC.BL_DOC},
 * sin copiar binarios al sistema.
 *
 * El puente con la serie es su `fuente_referencia` (ver {@see AcervoReferenciaSgd}):
 * de ahí salen las dependencias del SGD, el tipo documental, el año y si la
 * serie reúne documentos emitidos (TDTV_REMITOS) o recibidos (TDTV_DESTINOS).
 */
class AcervoSgdService
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
     * Lista paginada de los documentos del SGD de una serie digital. Filtra por
     * los criterios de la serie y, opcionalmente, por texto en el asunto. Agrega el tamaño del PDF (DATALENGTH) sin traer el binario.
     *
     * @return array{data: list<array<string, mixed>>, meta: array<string, int>}
     */
    public function documentos(AcervoDocumental $acervo, ?string $busqueda, int $page, int $perPage): array
    {
        [$where, $bindings] = $this->filtroSerie($this->referencia($acervo));

        if ($busqueda !== null && $busqueda !== '') {
            $where .= ' AND r.DE_ASU LIKE ?';
            $bindings[] = '%'.$busqueda.'%';
        }

        $conn = DB::connection($this->conexionSgd);

        $total = (int) $conn->selectOne(
            "SELECT COUNT(*) AS n FROM {$this->esquema}.TDTV_REMITOS r WHERE {$where}",
            $bindings
        )->n;

        $offset = max(0, ($page - 1) * $perPage);
        $sql = "SELECT r.NU_ANN AS ann, r.NU_EMI AS emi, r.NU_DOC_EMI AS nro_doc,
                       r.DE_ASU AS asunto, r.FE_EMI AS fecha, r.NU_FOLIOS AS folios,
                       CASE WHEN a.BL_DOC IS NULL THEN 0 ELSE DATALENGTH(a.BL_DOC) END AS bytes_pdf
                FROM {$this->esquema}.TDTV_REMITOS r
                LEFT JOIN {$this->esquema}.TDTV_ARCHIVO_DOC a
                       ON a.NU_ANN = r.NU_ANN AND a.NU_EMI = r.NU_EMI
                WHERE {$where}
                ORDER BY r.FE_EMI DESC, r.NU_EMI DESC
                OFFSET {$offset} ROWS FETCH NEXT {$perPage} ROWS ONLY";

        $filas = $conn->select($sql, $bindings);

        $data = array_map(function ($f) {
            $bytes = (int) ($f->bytes_pdf ?? 0);

            return [
                'emi' => $this->texto($f->emi),
                'numero_documento' => $this->texto($f->nro_doc),
                'asunto' => $this->texto($f->asunto) ?? 'Sin asunto registrado',
                'fecha' => $this->fecha($f->fecha),
                'folios' => $f->folios !== null ? (int) $f->folios : null,
                'tiene_pdf' => $bytes > 0,
                'bytes_pdf' => $bytes,
            ];
        }, $filas);

        return [
            'data' => $data,
            'meta' => [
                'total' => $total,
                'per_page' => $perPage,
                'current_page' => $page,
                'last_page' => (int) max(1, (int) ceil($total / max(1, $perPage))),
            ],
        ];
    }

    /**
     * Streaming del PDF principal (TDTV_ARCHIVO_DOC.BL_DOC) de un documento. Valida
     * que el documento pertenezca a la serie (mismos criterios que su listado);
     * así el `emi` no permite pedir documentos arbitrarios fuera del ámbito ya
     * autorizado por el controller. Devuelve 404 si el documento no existe en el
     * universo de la fila, y 404 si existe pero no tiene binario.
     */
    public function streamPdf(AcervoDocumental $acervo, string $emi): StreamedResponse
    {
        $ref = $this->referencia($acervo);
        [$where, $bindings] = $this->filtroSerie($ref);
        $conn = DB::connection($this->conexionSgd);

        $pertenece = $conn->selectOne(
            "SELECT TOP 1 r.NU_EMI FROM {$this->esquema}.TDTV_REMITOS r WHERE {$where} AND r.NU_EMI = ?",
            [...$bindings, $emi]
        );

        if ($pertenece === null) {
            throw new HttpResponseException(
                ApiResponse::error('El documento no pertenece a esta serie documental.', 404)
            );
        }

        $archivo = $conn->selectOne(
            "SELECT a.BL_DOC AS doc, DATALENGTH(a.BL_DOC) AS bytes
             FROM {$this->esquema}.TDTV_ARCHIVO_DOC a
             WHERE a.NU_ANN = ? AND a.NU_EMI = ? AND a.BL_DOC IS NOT NULL",
            [$ref['anio'], $emi]
        );

        if ($archivo === null || $archivo->doc === null) {
            throw new HttpResponseException(
                ApiResponse::error('El documento no tiene un archivo principal en el SGD.', 404)
            );
        }

        $nombre = "SGD-{$ref['anio']}-{$emi}.pdf";
        $contenido = $archivo->doc;

        return new StreamedResponse(function () use ($contenido) {
            echo $contenido;
        }, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.$nombre.'"',
            'Content-Length' => (string) (int) $archivo->bytes,
            'Cache-Control' => 'private, max-age=0, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    /**
     * Condición SQL sobre `TDTV_REMITOS r` que delimita los documentos de la
     * serie, con los mismos criterios que la ingesta: emitidos por las
     * dependencias, o recibidos (leídos o atendidos) por ellas.
     *
     * @param  array{sentido: string, deps: list<string>, tipo: string, anio: string}  $ref
     * @return array{0: string, 1: list<string>}
     */
    private function filtroSerie(array $ref): array
    {
        $deps = $this->marcadores($ref['deps']);

        if ($ref['sentido'] === AcervoReferenciaSgd::RECIBIDOS) {
            $emisionExcluida = $this->marcadores(IngestaDocumentalSgd::EMISION_EXCLUIDA);
            $noRecibida = $this->marcadores(IngestaDocumentalSgd::RECEPCION_NO_RECIBIDA);

            return [
                "r.NU_ANN = ? AND r.ES_ELI = '0' AND r.ES_DOC_EMI NOT IN ({$emisionExcluida})
                 AND r.CO_TIP_DOC_ADM = ?
                 AND EXISTS (SELECT 1 FROM {$this->esquema}.TDTV_DESTINOS d
                             WHERE d.NU_ANN = r.NU_ANN AND d.NU_EMI = r.NU_EMI AND d.ES_ELI = '0'
                               AND d.ES_DOC_REC IS NOT NULL AND d.ES_DOC_REC NOT IN ({$noRecibida})
                               AND d.CO_DEP_DES IN ({$deps}))",
                [$ref['anio'], ...IngestaDocumentalSgd::EMISION_EXCLUIDA, $ref['tipo'],
                    ...IngestaDocumentalSgd::RECEPCION_NO_RECIBIDA, ...$ref['deps']],
            ];
        }

        return [
            "r.NU_ANN = ? AND r.ES_ELI = '0' AND r.ES_DOC_EMI NOT IN ('9')
             AND r.CO_DEP_EMI IN ({$deps}) AND r.CO_TIP_DOC_ADM = ?",
            [$ref['anio'], ...$ref['deps'], $ref['tipo']],
        ];
    }

    /**
     * Lee la referencia SGD de la serie. Exige que sea una serie digital de
     * origen SGD.
     *
     * @return array{sentido: string, deps: list<string>, tipo: string, anio: string}
     */
    private function referencia(AcervoDocumental $acervo): array
    {
        $ref = AcervoReferenciaSgd::leer((string) ($acervo->getAttribute('fuente_referencia') ?? ''));

        if ($ref === null || $ref['deps'] === []) {
            throw new HttpResponseException(
                ApiResponse::error('Esta serie no proviene del SGD; no tiene documentos digitales consultables.', 422)
            );
        }

        return $ref;
    }

    /** @param  list<string>  $valores */
    private function marcadores(array $valores): string
    {
        return implode(',', array_fill(0, count($valores), '?'));
    }

    private function fecha(mixed $valor): ?string
    {
        if ($valor === null) {
            return null;
        }
        try {
            return Carbon::parse((string) $valor)->toDateString();
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

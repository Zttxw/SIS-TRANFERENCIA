<?php

declare(strict_types=1);

namespace App\Modules\Organization\Services;

use App\Modules\Acervo\Services\AcervoReferenciaSgd;
use App\Modules\Organization\Models\EquivalenciaCentroCosto;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Traslada a su centro de costo los registros que hoy apuntan a dependencias
 * del SGD (D-11). Solo mueve lo que tiene equivalencia asignada; el resto queda
 * en su dependencia de origen, fuera del flujo, y se informa.
 *
 * Es idempotente: una segunda ejecución no encuentra nada que mover.
 */
class ReasignacionCentrosCosto
{
    /** Tablas sin unicidad por dependencia: basta con cambiar el FK. */
    private const TABLAS_SIMPLES = [
        'bienes_patrimoniales',
        'bienes_no_patrimoniales',
        'documentos_pendientes',
        'personal',
        'servidores',
    ];

    /**
     * Tablas del flujo (una fila por dependencia y proceso, o firmas atadas a
     * una huella). Si alguna dependencia del SGD ya las tiene, no se pueden
     * fusionar sin perder trazabilidad: se detiene la reasignación.
     */
    private const TABLAS_DE_FLUJO = [
        'entregas',
        'informes_gestion',
        'actas_transferencia',
        'expedientes',
        'firmas_anexo',
        'firma_sesiones',
        'firma_borradores',
        'documentos_firma',
        'cronograma_actividades',
        'vistos_buenos_delegado',
    ];

    /**
     * @return array{
     *     movidos: array<string, int>,
     *     acervo_fusionado: int,
     *     sin_asignar: list<array{codigo: string, nombre: string, registros: int}>
     * }
     */
    public function ejecutar(int $procesoId, bool $simular = false): array
    {
        $destinos = EquivalenciaCentroCosto::query()
            ->where('proceso_transferencia_id', $procesoId)
            ->where('origen', EquivalenciaCentroCosto::ORIGEN_SGD)
            ->whereNotNull('dependencia_origen_id')
            ->whereNotNull('centro_costo_id')
            ->pluck('centro_costo_id', 'dependencia_origen_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $this->exigirFlujoVacio(array_keys($destinos));

        $resultado = ['movidos' => [], 'acervo_fusionado' => 0, 'sin_asignar' => []];

        // La simulación ejecuta exactamente lo mismo y descarta los cambios.
        DB::beginTransaction();
        try {
            foreach (self::TABLAS_SIMPLES as $tabla) {
                $resultado['movidos'][$tabla] = 0;
                foreach ($destinos as $origenId => $centroId) {
                    $resultado['movidos'][$tabla] += DB::table($tabla)
                        ->where('dependencia_id', $origenId)
                        ->update(['dependencia_id' => $centroId]);
                }
            }

            $resultado['movidos']['asignaciones_rol'] = $this->moverAsignaciones($destinos);
            [$resultado['movidos']['acervo_documental'], $resultado['acervo_fusionado']] = $this->moverAcervo($destinos);
            $resultado['sin_asignar'] = $this->pendientesSinAsignar($procesoId);

            $simular ? DB::rollBack() : DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();

            throw $e;
        }

        return $resultado;
    }

    /** @param list<int> $origenes */
    private function exigirFlujoVacio(array $origenes): void
    {
        if ($origenes === []) {
            return;
        }

        foreach (self::TABLAS_DE_FLUJO as $tabla) {
            if (DB::table($tabla)->whereIn('dependencia_id', $origenes)->exists()) {
                throw new RuntimeException("La tabla {$tabla} tiene registros en dependencias del SGD; reasígnelos a mano antes de continuar.");
            }
        }
    }

    /**
     * Una misma persona puede tener el mismo rol en dos dependencias del SGD que
     * caen en el mismo CC: se conserva una sola asignación.
     *
     * @param  array<int, int>  $destinos
     */
    private function moverAsignaciones(array $destinos): int
    {
        $movidas = 0;
        foreach ($destinos as $origenId => $centroId) {
            $asignaciones = DB::table('asignaciones_rol')->where('dependencia_id', $origenId)->get();
            foreach ($asignaciones as $asignacion) {
                $movidas++;
                $duplicada = DB::table('asignaciones_rol')
                    ->where('proceso_transferencia_id', $asignacion->proceso_transferencia_id)
                    ->where('user_id', $asignacion->user_id)
                    ->where('rol', $asignacion->rol)
                    ->where('dependencia_id', $centroId)
                    ->exists();

                $duplicada
                    ? DB::table('asignaciones_rol')->where('id', $asignacion->id)->delete()
                    : DB::table('asignaciones_rol')->where('id', $asignacion->id)->update(['dependencia_id' => $centroId]);
            }
        }

        return $movidas;
    }

    /**
     * El acervo digital del SGD es un resumen por dependencia, serie y año.
     * Si dos dependencias del SGD caen en el mismo CC, sus filas se suman en
     * una sola y la referencia conserva todos los códigos de origen.
     *
     * @param  array<int, int>  $destinos
     * @return array{0: int, 1: int}
     */
    private function moverAcervo(array $destinos): array
    {
        $movidas = 0;
        $fusionadas = 0;
        $ahora = Carbon::now();

        foreach ($destinos as $origenId => $centroId) {
            $filas = DB::table('acervo_documental')->where('dependencia_id', $origenId)->whereNull('deleted_at')->get();
            foreach ($filas as $fila) {
                $movidas++;
                $existente = $fila->fuente === 'sgd' ? DB::table('acervo_documental')
                    ->where('proceso_transferencia_id', $fila->proceso_transferencia_id)
                    ->where('dependencia_id', $centroId)
                    ->where('tipo', $fila->tipo)
                    ->where('fuente', 'sgd')
                    ->where('serie_documental', $fila->serie_documental)
                    ->where('anio', $fila->anio)
                    ->whereNull('deleted_at')
                    ->first() : null;

                if ($existente === null) {
                    DB::table('acervo_documental')->where('id', $fila->id)->update(['dependencia_id' => $centroId]);

                    continue;
                }

                $fusionadas++;
                DB::table('acervo_documental')->where('id', $existente->id)->update([
                    'numero_documentos' => (int) $existente->numero_documentos + (int) $fila->numero_documentos,
                    'fuente_referencia' => AcervoReferenciaSgd::fusionar((string) $existente->fuente_referencia, (string) $fila->fuente_referencia),
                    'updated_at' => $ahora,
                ]);
                DB::table('acervo_documental')->where('id', $fila->id)->update(['deleted_at' => $ahora, 'dependencia_id' => $centroId]);
            }
        }

        return [$movidas, $fusionadas];
    }

    /**
     * Dependencias del SGD que siguen con registros y no tienen CC.
     *
     * @return list<array{codigo: string, nombre: string, registros: int}>
     */
    private function pendientesSinAsignar(int $procesoId): array
    {
        $tablas = array_merge(self::TABLAS_SIMPLES, ['acervo_documental', 'asignaciones_rol']);

        return DB::table('dependencias')
            ->where('proceso_transferencia_id', $procesoId)
            ->where('es_centro_costo', false)
            ->whereNull('deleted_at')
            ->orderBy('codigo')
            ->get(['id', 'codigo', 'nombre'])
            ->map(function ($dependencia) use ($tablas): array {
                $registros = 0;
                foreach ($tablas as $tabla) {
                    $consulta = DB::table($tabla)->where('dependencia_id', $dependencia->id);
                    if ($tabla === 'acervo_documental') {
                        $consulta->whereNull('deleted_at');
                    }
                    $registros += $consulta->count();
                }

                return ['codigo' => $dependencia->codigo, 'nombre' => $dependencia->nombre, 'registros' => $registros];
            })
            ->filter(fn (array $fila) => $fila['registros'] > 0)
            ->values()
            ->all();
    }
}

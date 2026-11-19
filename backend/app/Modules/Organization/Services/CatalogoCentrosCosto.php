<?php

declare(strict_types=1);

namespace App\Modules\Organization\Services;

use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\FuenteDato;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Catálogo de los 64 centros de costo del Anexo 01, tal como están registrados
 * en CEPLAN (D-01): código, descripción, nivel y CC padre, sin correcciones.
 *
 * Cada CC se guarda como fila de `dependencias` con `es_centro_costo = true`.
 * El ruteo (D-02) queda en `parent_id`: el CC padre del Anexo 01, o NULL cuando
 * el padre es el mismo CC (envía directo al ETTS).
 */
class CatalogoCentrosCosto
{
    public const ARCHIVO = 'data/anexo01_centros_costo.csv';

    /**
     * Carga o actualiza el catálogo en el proceso. Idempotente.
     *
     * @return array{creados: int, actualizados: int}
     */
    public function instalar(ProcesoTransferencia $proceso): array
    {
        $filas = $this->leer();
        $ahora = Carbon::now();

        return DB::transaction(function () use ($proceso, $filas, $ahora): array {
            $creados = 0;
            $idPorCodigo = [];

            foreach ($filas as $fila) {
                $centro = Dependencia::withTrashed()->firstOrNew([
                    'proceso_transferencia_id' => $proceso->id,
                    'es_centro_costo' => true,
                    'codigo_ceplan' => $fila['codigo'],
                ]);
                $creados += $centro->exists ? 0 : 1;

                $centro->fill([
                    'codigo' => $fila['codigo'],
                    'nombre' => $fila['descripcion'],
                    'nivel' => $fila['nivel'],
                    'activa' => true,
                    'fuente' => FuenteDato::CEPLAN->value,
                    'fuente_referencia' => "ANEXO_01.CODIGO={$fila['codigo']}",
                    'extraido_en' => $ahora,
                ])->save();

                if ($centro->trashed()) {
                    $centro->restore();
                }

                $idPorCodigo[$fila['codigo']] = $centro->id;
            }

            foreach ($filas as $fila) {
                $padreId = $fila['codigo_padre'] === $fila['codigo'] ? null : $idPorCodigo[$fila['codigo_padre']];
                Dependencia::whereKey($idPorCodigo[$fila['codigo']])->update(['parent_id' => $padreId]);
            }

            return ['creados' => $creados, 'actualizados' => count($filas) - $creados];
        });
    }

    /**
     * @return list<array{codigo: string, descripcion: string, nivel: int, codigo_padre: string}>
     */
    public function leer(): array
    {
        $ruta = database_path(self::ARCHIVO);
        $manejador = fopen($ruta, 'r');
        if ($manejador === false) {
            throw new RuntimeException("No se pudo leer el catálogo del Anexo 01: {$ruta}");
        }

        $encabezado = fgetcsv($manejador, escape: '\\');
        $filas = [];
        while (($valores = fgetcsv($manejador, escape: '\\')) !== false) {
            $fila = array_combine($encabezado, $valores);
            $filas[] = [
                'codigo' => trim($fila['codigo']),
                'descripcion' => trim($fila['descripcion']),
                'nivel' => (int) $fila['nivel'],
                'codigo_padre' => trim($fila['codigo_padre']),
            ];
        }
        fclose($manejador);

        $codigos = array_column($filas, 'codigo');
        foreach ($filas as $fila) {
            if (! in_array($fila['codigo_padre'], $codigos, true)) {
                throw new RuntimeException("El CC {$fila['codigo']} apunta a un padre inexistente ({$fila['codigo_padre']}).");
            }
        }

        return $filas;
    }
}

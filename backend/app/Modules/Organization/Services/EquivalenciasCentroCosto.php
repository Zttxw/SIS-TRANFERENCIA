<?php

declare(strict_types=1);

namespace App\Modules\Organization\Services;

use App\Models\User;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Organization\Models\EquivalenciaCentroCosto;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use RuntimeException;

/**
 * Tabla de equivalencias SGD/SIGA → centro de costo del Anexo 01 (D-11).
 *
 * La vinculación se decide a mano y por nombre: no hay un código común entre
 * los sistemas. La propuesta inicial vive en `database/data/equivalencias_centro_costo.csv`
 * y el administrador la corrige desde la pantalla de equivalencias. Lo que no
 * tiene equivalencia queda «sin asignar» y fuera del flujo.
 */
class EquivalenciasCentroCosto
{
    public const ARCHIVO = 'data/equivalencias_centro_costo.csv';

    /**
     * Carga la propuesta del CSV. No pisa lo que el administrador ya confirmó.
     * Registra además como «sin asignar» toda dependencia del SGD que el CSV no
     * mencione, para que aparezca en la pantalla de revisión.
     *
     * @return array{asignadas: int, sin_asignar: int, conservadas: int}
     */
    public function cargarPropuesta(ProcesoTransferencia $proceso): array
    {
        $centros = $this->centrosPorCodigo($proceso->id);
        $dependenciasSgd = Dependencia::query()
            ->where('proceso_transferencia_id', $proceso->id)
            ->where('es_centro_costo', false)
            ->where('fuente', EquivalenciaCentroCosto::ORIGEN_SGD)
            ->get(['id', 'codigo', 'nombre'])
            ->keyBy('codigo');

        $resultado = ['asignadas' => 0, 'sin_asignar' => 0, 'conservadas' => 0];

        DB::transaction(function () use ($proceso, $centros, $dependenciasSgd, &$resultado): void {
            $mencionadas = [];

            foreach ($this->leer() as $fila) {
                $codigoCc = $fila['codigo_cc'];
                if ($codigoCc !== '' && ! isset($centros[$codigoCc])) {
                    throw new RuntimeException("La equivalencia de «{$fila['nombre_origen']}» apunta a un CC inexistente ({$codigoCc}).");
                }

                $dependencia = null;
                if ($fila['origen'] === EquivalenciaCentroCosto::ORIGEN_SGD) {
                    $dependencia = $dependenciasSgd->get($fila['codigo_origen']);
                    // Aún no ingerida: se registrará cuando llegue del SGD.
                    if ($dependencia === null) {
                        continue;
                    }
                    $mencionadas[$fila['codigo_origen']] = true;
                }

                $equivalencia = EquivalenciaCentroCosto::firstOrNew([
                    'proceso_transferencia_id' => $proceso->id,
                    'origen' => $fila['origen'],
                    'codigo_origen' => $fila['codigo_origen'],
                ]);

                $equivalencia->fill([
                    'nombre_origen' => $dependencia->nombre ?? $fila['nombre_origen'],
                    'dependencia_origen_id' => $dependencia?->id,
                ]);

                if ($equivalencia->confirmada_por_id !== null) {
                    $equivalencia->save();
                    $resultado['conservadas']++;

                    continue;
                }

                $equivalencia->fill([
                    'centro_costo_id' => $codigoCc === '' ? null : $centros[$codigoCc],
                    'es_principal' => $codigoCc !== '' && $fila['principal'],
                ])->save();
                $resultado[$codigoCc === '' ? 'sin_asignar' : 'asignadas']++;
            }

            foreach ($dependenciasSgd as $codigo => $dependencia) {
                if (! isset($mencionadas[$codigo])) {
                    $this->registrarOrigen($proceso->id, EquivalenciaCentroCosto::ORIGEN_SGD, (string) $codigo, $dependencia->nombre, $dependencia->id);
                    $resultado['sin_asignar']++;
                }
            }
        });

        $this->sincronizarEncargados($proceso->id);

        return $resultado;
    }

    /**
     * Registra una unidad de origen nueva (llegada por ingesta) sin asignarla.
     * Si ya existe, solo actualiza su nombre y su fila de origen.
     */
    public function registrarOrigen(int $procesoId, string $origen, string $codigo, ?string $nombre, ?int $dependenciaOrigenId = null): EquivalenciaCentroCosto
    {
        $equivalencia = EquivalenciaCentroCosto::firstOrNew([
            'proceso_transferencia_id' => $procesoId,
            'origen' => $origen,
            'codigo_origen' => $codigo,
        ]);

        $equivalencia->fill(array_filter([
            'nombre_origen' => $nombre,
            'dependencia_origen_id' => $dependenciaOrigenId,
        ], fn ($valor) => $valor !== null))->save();

        return $equivalencia;
    }

    /**
     * Código de origen → id del CC, solo de las equivalencias asignadas.
     *
     * @return array<string, int>
     */
    public function mapa(int $procesoId, string $origen): array
    {
        return EquivalenciaCentroCosto::query()
            ->where('proceso_transferencia_id', $procesoId)
            ->where('origen', $origen)
            ->whereNotNull('centro_costo_id')
            ->pluck('centro_costo_id', 'codigo_origen')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    /**
     * Dónde se graba lo que el SGD reporta para cada código de dependencia: en
     * su CC si tiene equivalencia y, si no, en la propia dependencia del SGD
     * (queda fuera del flujo hasta que se asigne y se reasigne).
     *
     * @return array<string, int>
     */
    public function destinosSgd(int $procesoId): array
    {
        $centros = $this->mapa($procesoId, EquivalenciaCentroCosto::ORIGEN_SGD);

        return Dependencia::query()
            ->where('proceso_transferencia_id', $procesoId)
            ->where('es_centro_costo', false)
            ->pluck('id', 'codigo')
            ->map(fn ($id, $codigo) => $centros[(string) $codigo] ?? (int) $id)
            ->all();
    }

    /**
     * Códigos del SGD que se graban en el mismo destino que el código dado.
     * Sirve para que una ingesta parcial («piloto») traiga el CC completo.
     *
     * @return list<string>
     */
    public function codigosSgdHermanos(int $procesoId, string $codigo): array
    {
        $destinos = $this->destinosSgd($procesoId);
        if (! isset($destinos[$codigo])) {
            return [$codigo];
        }

        return array_map('strval', array_keys(array_filter($destinos, fn (int $destino) => $destino === $destinos[$codigo])));
    }

    /**
     * Códigos del SGD vinculados a un CC (para consultar el SGD por todas sus
     * dependencias de origen).
     *
     * @return list<string>
     */
    public function codigosSgdDe(int $centroCostoId): array
    {
        return EquivalenciaCentroCosto::query()
            ->where('centro_costo_id', $centroCostoId)
            ->where('origen', EquivalenciaCentroCosto::ORIGEN_SGD)
            ->orderBy('codigo_origen')
            ->pluck('codigo_origen')
            ->all();
    }

    /**
     * El administrador asigna (o deja sin asignar) una unidad de origen. Marcar
     * una dependencia del SGD como principal desmarca a las demás del mismo CC,
     * porque de ella sale el responsable del CC.
     */
    public function asignar(EquivalenciaCentroCosto $equivalencia, ?int $centroCostoId, bool $esPrincipal, User $usuario): EquivalenciaCentroCosto
    {
        if ($centroCostoId !== null) {
            $valido = Dependencia::query()->centrosCosto()
                ->whereKey($centroCostoId)
                ->where('proceso_transferencia_id', $equivalencia->proceso_transferencia_id)
                ->exists();
            if (! $valido) {
                throw ValidationException::withMessages(['centro_costo_id' => 'El centro de costo no pertenece al Anexo 01 del proceso.']);
            }
        }

        if ($esPrincipal && ($centroCostoId === null || $equivalencia->origen !== EquivalenciaCentroCosto::ORIGEN_SGD)) {
            throw ValidationException::withMessages(['es_principal' => 'Solo una dependencia del SGD asignada a un CC puede ser la principal.']);
        }

        DB::transaction(function () use ($equivalencia, $centroCostoId, $esPrincipal, $usuario): void {
            if ($esPrincipal) {
                EquivalenciaCentroCosto::query()
                    ->where('centro_costo_id', $centroCostoId)
                    ->whereKeyNot($equivalencia->id)
                    ->update(['es_principal' => false]);
            }

            $equivalencia->fill([
                'centro_costo_id' => $centroCostoId,
                'es_principal' => $esPrincipal,
                'confirmada_por_id' => $usuario->id,
                'confirmada_en' => Carbon::now(),
            ])->save();
        });

        $this->sincronizarEncargados($equivalencia->proceso_transferencia_id);

        return $equivalencia->refresh();
    }

    /**
     * El responsable de cada CC es el encargado que el SGD declara para su
     * dependencia principal. Un CC sin principal queda sin encargado y el ETTS
     * designa al responsable a mano (RF-06).
     */
    public function sincronizarEncargados(int $procesoId): void
    {
        $principales = EquivalenciaCentroCosto::query()
            ->with('dependenciaOrigen:id,encargado_servidor_id,codigo_encargado_sgd,tipo_encargatura,codigo_titular_sgd')
            ->where('proceso_transferencia_id', $procesoId)
            ->where('es_principal', true)
            ->whereNotNull('centro_costo_id')
            ->get()
            ->keyBy('centro_costo_id');

        Dependencia::query()->centrosCosto()
            ->where('proceso_transferencia_id', $procesoId)
            ->get()
            ->each(function (Dependencia $centro) use ($principales): void {
                $origen = $principales->get($centro->id)?->dependenciaOrigen;
                $centro->fill([
                    'encargado_servidor_id' => $origen?->encargado_servidor_id,
                    'codigo_encargado_sgd' => $origen?->codigo_encargado_sgd,
                    'tipo_encargatura' => $origen?->tipo_encargatura,
                    'codigo_titular_sgd' => $origen?->codigo_titular_sgd,
                ]);
                if ($centro->isDirty()) {
                    $centro->save();
                }
            });
    }

    /** @return array<string, int> codigo CEPLAN → id */
    private function centrosPorCodigo(int $procesoId): array
    {
        return Dependencia::query()->centrosCosto()
            ->where('proceso_transferencia_id', $procesoId)
            ->pluck('id', 'codigo_ceplan')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    /**
     * @return list<array{origen: string, codigo_origen: string, nombre_origen: string, codigo_cc: string, principal: bool}>
     */
    private function leer(): array
    {
        $ruta = database_path(self::ARCHIVO);
        $manejador = fopen($ruta, 'r');
        if ($manejador === false) {
            throw new RuntimeException("No se pudo leer la tabla de equivalencias: {$ruta}");
        }

        $encabezado = fgetcsv($manejador, escape: '\\');
        $filas = [];
        while (($valores = fgetcsv($manejador, escape: '\\')) !== false) {
            $fila = array_combine($encabezado, $valores);
            $filas[] = [
                'origen' => trim($fila['origen']),
                'codigo_origen' => trim($fila['codigo_origen']),
                'nombre_origen' => trim($fila['nombre_origen']),
                'codigo_cc' => trim($fila['codigo_cc']),
                'principal' => trim($fila['principal']) === '1',
            ];
        }
        fclose($manejador);

        return $filas;
    }
}

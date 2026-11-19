<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Modules\Organization\Services\ReasignacionCentrosCosto;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use Illuminate\Console\Command;
use Throwable;

/**
 * Traslada a su centro de costo del Anexo 01 los bienes, documentos, acervo,
 * personal, servidores y asignaciones que hoy apuntan a dependencias del SGD
 * (D-11). Requiere el catálogo y la tabla de equivalencias cargados.
 */
class ReasignarCentrosCosto extends Command
{
    protected $signature = 'centros-costo:reasignar
        {--proceso= : ID o año del proceso (por defecto, el abierto más reciente)}
        {--simular : Calcula el resultado y descarta los cambios}
        {--sin-confirmar : Omitir confirmación interactiva}';

    protected $description = 'Reasigna los registros de las dependencias del SGD a su centro de costo del Anexo 01';

    public function handle(ReasignacionCentrosCosto $servicio): int
    {
        $proceso = $this->resolverProceso();
        if ($proceso === null) {
            $this->error('No se encontró ningún proceso de transferencia.');

            return self::FAILURE;
        }

        $simular = (bool) $this->option('simular');
        $this->info('=== REASIGNACIÓN A CENTROS DE COSTO (ANEXO 01) ===');
        $this->line("• Proceso: #{$proceso->id} — {$proceso->nombre}");
        $this->line('• Modo: '.($simular ? 'simulación (no guarda cambios)' : 'definitivo'));

        if (! $simular && ! $this->option('sin-confirmar')
            && ! $this->confirm('¿Reasignar los registros? Haga antes un respaldo de la base.', false)) {
            $this->line('Reasignación cancelada.');

            return self::SUCCESS;
        }

        try {
            $resultado = $servicio->ejecutar($proceso->id, $simular);
        } catch (Throwable $e) {
            $this->error('✘ '.$e->getMessage());

            return self::FAILURE;
        }

        $this->table(['Tabla', 'Registros movidos'], collect($resultado['movidos'])
            ->map(fn (int $total, string $tabla) => [$tabla, $total])->values()->all());
        $this->line("Filas de acervo fusionadas (misma serie y periodo): {$resultado['acervo_fusionado']}");

        if ($resultado['sin_asignar'] !== []) {
            $this->newLine();
            $this->warn('Dependencias del SGD con registros y sin CC asignado (quedan fuera del flujo):');
            $this->table(['Código SGD', 'Nombre', 'Registros'], array_map(
                fn (array $fila) => [$fila['codigo'], $fila['nombre'], $fila['registros']],
                $resultado['sin_asignar'],
            ));
        }

        $this->info($simular ? '✔ Simulación terminada; no se guardó ningún cambio.' : '✔ Reasignación terminada.');

        return self::SUCCESS;
    }

    private function resolverProceso(): ?ProcesoTransferencia
    {
        $id = $this->option('proceso');
        if (is_string($id) && trim($id) !== '') {
            $id = trim($id);

            return is_numeric($id)
                ? ProcesoTransferencia::find((int) $id)
                : ProcesoTransferencia::where('anio', (int) $id)->first();
        }

        return ProcesoTransferencia::where('estado', 'abierto')
            ->orderByDesc('anio')
            ->first() ?? ProcesoTransferencia::first();
    }
}

<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Modules\Personal\Services\IngestaPersonalSgd;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use Illuminate\Console\Command;
use Throwable;

/**
 * Proyecta el padrón de servidores del SGD hacia la relación de personal del
 * Anexo 05. Corre sobre datos ya en PostgreSQL (no conecta al SGD), así que
 * puede ejecutarse desde el contenedor. Requiere haber corrido antes
 * `sgd:ingestar` para tener los servidores cargados.
 */
class IngestarPersonal extends Command
{
    protected $signature = 'personal:ingestar
        {--proceso= : ID o año del proceso (por defecto, el abierto más reciente)}
        {--dependencia= : Limitar a una dependencia por su código (ej: 00025)}
        {--sin-confirmar : Omitir confirmación interactiva}';

    protected $description = 'Genera la relación de personal del Anexo 05 a partir del padrón de servidores del SGD';

    public function handle(IngestaPersonalSgd $servicio): int
    {
        $proceso = $this->resolverProceso();
        if ($proceso === null) {
            $this->error('No se encontró ningún proceso de transferencia.');

            return self::FAILURE;
        }

        $dependencia = $this->option('dependencia');
        $dependencia = is_string($dependencia) && trim($dependencia) !== '' ? trim($dependencia) : null;

        $this->info('=== INGESTA DE PERSONAL (ANEXO 05) ===');
        $this->line("• Proceso: #{$proceso->id} — {$proceso->nombre}");
        $this->line('• Fuente: padrón de servidores del SGD (ya cargado en PostgreSQL)');
        $this->line('• Filtro: '.($dependencia !== null ? "Dependencia {$dependencia}" : 'Todas las dependencias'));

        if (! $this->option('sin-confirmar')
            && ! $this->confirm('¿Generar/actualizar la relación de personal?', true)) {
            $this->line('Ingesta cancelada.');

            return self::SUCCESS;
        }

        try {
            $metricas = $servicio->ejecutar($proceso, $dependencia);

            $this->newLine();
            $this->info('✔ Relación de personal generada.');
            $this->table(['Métrica', 'Valor'], [
                ['Personal ingestado/actualizado (Anexo 05)', $metricas['personal']],
                ['Omitidos (manuales o retirados)', $metricas['omitidos']],
            ]);

            if ($metricas['personal'] === 0 && $metricas['omitidos'] === 0) {
                $this->comment('No hay servidores con dependencia para proyectar. ¿Corriste `sgd:ingestar` primero?');
            }

            return self::SUCCESS;
        } catch (Throwable $e) {
            $this->newLine();
            $this->error('✘ Error al generar la relación de personal:');
            $this->error($e->getMessage());

            return self::FAILURE;
        }
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

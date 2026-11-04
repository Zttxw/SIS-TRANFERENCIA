<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Modules\Patrimonio\Services\IngestaPatrimonioSiga;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use Illuminate\Console\Command;
use Throwable;

/**
 * Ingesta de SOLO LECTURA del inventario patrimonial del SIGA-MEF hacia PostgreSQL (Anexo 04).
 * Soporta conexión MSSQL oficial y réplica SQLite de contingencia / desarrollo.
 */
class IngestarSiga extends Command
{
    protected $signature = 'siga:ingestar
        {--proceso= : ID o año del proceso de transferencia (por defecto, el abierto más reciente)}
        {--cc= : Limitar la ingesta a un centro de costo específico (ej: 01.03.07.04 para OTI)}
        {--sqlite : Usar la réplica SQLite local en vez de conectar al SQL Server remoto}
        {--sin-confirmar : Omitir confirmación interactiva}';

    protected $description = 'Ingesta de SOLO LECTURA del módulo patrimonial del SIGA hacia PostgreSQL (Anexo 04)';

    public function handle(IngestaPatrimonioSiga $ingestaService): int
    {
        $proceso = $this->resolverProceso();
        if ($proceso === null) {
            $this->error('No se encontró ningún proceso de transferencia abierto.');

            return self::FAILURE;
        }

        $cc = $this->option('cc');
        $cc = is_string($cc) && trim($cc) !== '' ? trim($cc) : null;
        $usarSqlite = (bool) $this->option('sqlite');

        $this->info('=== INGESTA PATRIMONIAL DEL SIGA-MEF (ANEXO 04) ===');
        $this->line("• Proceso: #{$proceso->id} — {$proceso->nombre}");
        $this->line('• Fuente: '.($usarSqlite ? 'Réplica SQLite local (siga_replica.sqlite)' : 'SQL Server oficial (192.168.50.53)'));
        if ($cc !== null) {
            $this->line("• Filtro: Centro de Costo {$cc}");
        } else {
            $this->line('• Filtro: Todos los centros de costo institucionales');
        }

        if (! $this->option('sin-confirmar')
            && ! $this->confirm('¿Desea iniciar la ingesta hacia PostgreSQL?', true)) {
            $this->line('Ingesta cancelada.');

            return self::SUCCESS;
        }

        $this->info('Iniciando extracción y sincronización...');

        try {
            $metricas = $ingestaService->ejecutar($proceso, $cc, $usarSqlite);

            $this->newLine();
            $this->info('✔ ¡Ingesta patrimonial completada con éxito!');

            $filas = [
                ['Dependencias / Centros de Costo', $metricas['dependencias']],
                ['Servidores Responsables vinculados', $metricas['servidores']],
                ['Bienes Patrimoniales importados (Anexo 04)', $metricas['bienes']],
                ['Valor Total Adquisición (S/)', number_format($metricas['valor_total'], 2)],
            ];

            $this->table(['Métrica', 'Valor'], $filas);

            return self::SUCCESS;
        } catch (Throwable $e) {
            $this->newLine();
            $this->error('✘ Error al ejecutar la ingesta del SIGA:');
            $this->error($e->getMessage());

            if (! $usarSqlite) {
                $this->comment('Tip: Si estás fuera de la oficina, ejecuta el comando con: php artisan siga:ingestar --sqlite');
            }

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

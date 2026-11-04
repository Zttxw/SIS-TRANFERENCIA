<?php

declare(strict_types=1);

namespace App\Integrations\Siga\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Throwable;

class TestSigaConnectionCommand extends Command
{
    protected $signature = 'siga:test-connection 
        {--sqlite : Probar contra la réplica SQLite local en vez del servidor remoto}';

    protected $description = 'Verifica la conexión a la base de datos del SIGA (remota o réplica SQLite)';

    public function handle(): int
    {
        $usarSqlite = (bool) $this->option('sqlite');
        $conexion = $usarSqlite ? 'siga_sqlite' : 'siga';

        $this->info("Probando conexión SIGA [{$conexion}]...");

        try {
            $db = DB::connection($conexion);

            if ($usarSqlite) {
                $tablas = $db->select("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
                $this->info('✔ Réplica SQLite conectada con éxito.');
                $this->line('Total tablas encontradas: '.count($tablas));

                $nombresTablas = array_map(fn ($t) => $t->name, $tablas);
                $this->line('Muestra: '.implode(', ', array_slice($nombresTablas, 0, 8)).'...');

                // Buscar tabla de patrimonio en la réplica
                $tablaPatri = in_array('SIG_PATRIMONIO', $nombresTablas, true)
                    ? 'SIG_PATRIMONIO'
                    : (in_array('src_SIG_PATRIMONIO', $nombresTablas, true) ? 'src_SIG_PATRIMONIO' : null);

                if ($tablaPatri) {
                    $total = $db->selectOne("SELECT COUNT(*) as cant FROM {$tablaPatri}")->cant;
                    $this->info("✔ Tabla de patrimonio '{$tablaPatri}' encontrada con ".number_format((int) $total).' registros.');
                }
            } else {
                $versionInfo = $db->selectOne('SELECT @@VERSION as version, DB_NAME() as current_db');
                $this->info('✔ ¡Conexión con SIGA MSSQL establecida con éxito!');
                $this->line('  Base de datos conectada: '.($versionInfo->current_db ?? 'N/A'));
            }

            return self::SUCCESS;
        } catch (Throwable $e) {
            $this->newLine();
            $this->error("✘ Error de conexión [{$conexion}]:");
            $this->error($e->getMessage());

            if (! $usarSqlite) {
                $this->comment('Tip: Puedes probar la réplica local usando: php artisan siga:test-connection --sqlite');
            }

            return self::FAILURE;
        }
    }
}

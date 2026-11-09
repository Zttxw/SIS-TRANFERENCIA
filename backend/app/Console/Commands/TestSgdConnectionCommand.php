<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Throwable;

class TestSgdConnectionCommand extends Command
{
    protected $signature = 'sgd:test-connection';

    protected $description = 'Verifica la conexión a la base de datos del SGD (SQL Server)';

    public function handle(): int
    {
        $this->info('Probando conexión al SGD [sgd]...');

        try {
            $db = DB::connection('sgd');
            $versionInfo = $db->selectOne('SELECT @@VERSION as version, DB_NAME() as current_db');
            $this->info('Conexión con SGD MSSQL establecida con éxito.');
            $this->line('  Base de datos: '.($versionInfo->current_db ?? 'N/A'));
            $this->line('  Versión: '.substr((string) ($versionInfo->version ?? ''), 0, 60).'...');

            $schema = config('sgd.schema', 'IDOSGD');
            $tablas = $db->select("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME", [$schema]);
            $this->info("Tablas encontradas en esquema [{$schema}]: ".count($tablas));

            // Verificar tablas críticas del SGD
            $criticas = ['RHTM_DEPENDENCIA', 'RHTM_PER_EMPLEADOS', 'RHTM_CARGOS', 'TDTV_REMITOS', 'TDTR_ARBOL_SEG'];
            foreach ($criticas as $tc) {
                $existe = collect($tablas)->contains('TABLE_NAME', $tc);
                if ($existe) {
                    $cant = $db->selectOne("SELECT COUNT(*) as cant FROM {$schema}.{$tc}")->cant;
                    $this->line("  - {$tc}: {$cant} registros");
                } else {
                    $this->warn("  - {$tc}: NO encontrada");
                }
            }

            return self::SUCCESS;
        } catch (Throwable $e) {
            $this->error('Error de conexión SGD: '.$e->getMessage());

            return self::FAILURE;
        }
    }
}

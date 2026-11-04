<?php

declare(strict_types=1);

namespace App\Integrations\Siga\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Throwable;

class TestSigaConnectionCommand extends Command
{
    protected $signature = 'siga:test-connection';
    protected $description = 'Verifica la conexión a la base de datos del SIGA';

    public function handle(): int
    {
        $this->info('Probando conexión con el sistema SIGA (MSSQL)...');

        $host = config('database.connections.siga.host');
        $port = config('database.connections.siga.port');
        $dbName = config('database.connections.siga.database');
        $user = config('database.connections.siga.username');

        $this->line("• Servidor: {$host}:{$port}");
        $this->line("• Base de datos: {$dbName}");
        $this->line("• Usuario: {$user}");

        try {
            $connection = DB::connection('siga');
            $versionInfo = $connection->selectOne("SELECT @@VERSION as version, DB_NAME() as current_db");

            $this->newLine();
            $this->info('✔ ¡Conexión con SIGA establecida con éxito!');
            $this->line('  Base de datos conectada: ' . ($versionInfo->current_db ?? 'N/A'));

            // Columnas de MARCA y SIG_PERSONAL
            $marcaCols = $connection->select("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MARCA'");
            $personalCols = $connection->select("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'SIG_PERSONAL'");

            $this->newLine();
            $this->info('Columnas clave detectadas:');
            $this->line('• MARCA: ' . implode(', ', array_map(fn ($c) => $c->COLUMN_NAME, $marcaCols)));
            $this->line('• SIG_PERSONAL: ' . implode(', ', array_slice(array_map(fn ($c) => $c->COLUMN_NAME, $personalCols), 0, 10)) . '...');

            return self::SUCCESS;
        } catch (Throwable $e) {
            $this->newLine();
            $this->error('✘ Error de conexión con SIGA:');
            $this->error($e->getMessage());
            return self::FAILURE;
        }
    }
}

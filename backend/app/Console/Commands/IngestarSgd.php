<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Modules\Organization\Services\IngestaCatalogosSgd;
use App\Modules\Organization\Services\IngestaDocumentalSgd;
use App\Modules\Organization\Services\IngestaSgd;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use Illuminate\Console\Command;
use Throwable;

/**
 * Ingesta de SOLO LECTURA del SGD hacia las tablas de dominio (plan §6 Etapa 1).
 *
 * Debe ejecutarse desde el HOST: el driver pdo_sqlsrv no está disponible en el
 * contenedor Alpine. Apuntar DB_* a la base de datos de la aplicación.
 */
class IngestarSgd extends Command
{
    protected $signature = 'sgd:ingestar
        {--proceso= : ID del proceso de transferencia (por defecto, el abierto más reciente)}
        {--dependencia= : Limitar la ingesta a una dependencia (piloto)}
        {--catalogos : Incluir catálogos del SGD (tipos documentales, estados)}
        {--documental : Incluir ingesta documental (acervo digital del Anexo 03)}
        {--solo-catalogos : Ejecutar únicamente la ingesta de catálogos}
        {--sin-confirmar : Omitir la confirmación previa}';

    protected $description = 'Importa estructura, padrón, catálogos y documentos del SGD (solo lectura)';

    public function handle(): int
    {
        $proceso = $this->resolverProceso();
        if ($proceso === null) {
            return self::FAILURE;
        }

        $dependencia = $this->option('dependencia');
        $dependencia = is_string($dependencia) && trim($dependencia) !== '' ? trim($dependencia) : null;

        $soloCatalogos = (bool) $this->option('solo-catalogos');
        $conCatalogos = $soloCatalogos || (bool) $this->option('catalogos') || (bool) $this->option('documental');
        $conDocumental = ! $soloCatalogos && (bool) $this->option('documental');
        $conOrganizacional = ! $soloCatalogos;

        $this->info("Proceso: #{$proceso->id} — {$proceso->nombre}");
        if ($dependencia !== null) {
            $this->line("Ámbito: dependencia {$dependencia} (piloto)");
        }
        $this->line('Fases: '.$this->describirFases($conOrganizacional, $conCatalogos, $conDocumental));

        if (! $this->option('sin-confirmar')
            && ! $this->confirm('Se leerá el SGD (solo lectura) y se poblarán las tablas de dominio. ¿Continuar?')) {
            $this->line('Ingesta cancelada.');

            return self::SUCCESS;
        }

        $filas = [];

        try {
            if ($conOrganizacional) {
                $m = IngestaSgd::desdeConfig()->ejecutar($proceso, $dependencia);
                $filas[] = ['Dependencias', $m['dependencias']];
                $filas[] = ['Servidores', $m['servidores']];
                $filas[] = ['Encargados resueltos', $m['encargados']];
            }

            // Los catálogos deben poblarse antes que la documental: esta los usa
            // para nombrar los tipos documentales.
            if ($conCatalogos) {
                $m = IngestaCatalogosSgd::desdeConfig()->ejecutar();
                $filas[] = ['Tipos documentales', $m['tipos']];
                $filas[] = ['Estados', $m['estados']];
            }

            if ($conDocumental) {
                $m = IngestaDocumentalSgd::desdeConfig()->ejecutar($proceso, $dependencia);
                $filas[] = ["Acervo digital (año {$m['anio']})", $m['acervo']];
            }
        } catch (Throwable $error) {
            $this->error('No se pudo completar la ingesta: '.$error->getMessage());

            return self::FAILURE;
        }

        $this->info('Ingesta completada.');
        $this->table(['Métrica', 'Valor'], $filas);

        return self::SUCCESS;
    }

    private function describirFases(bool $org, bool $cat, bool $doc): string
    {
        $fases = [];
        if ($org) {
            $fases[] = 'organizacional';
        }
        if ($cat) {
            $fases[] = 'catálogos';
        }
        if ($doc) {
            $fases[] = 'documental';
        }

        return $fases === [] ? 'solo catálogos' : implode(', ', $fases);
    }

    private function resolverProceso(): ?ProcesoTransferencia
    {
        $id = $this->option('proceso');
        if (is_string($id) && trim($id) !== '') {
            $proceso = ProcesoTransferencia::find((int) $id);
            if ($proceso === null) {
                $this->error("No existe el proceso de transferencia #{$id}.");
            }

            return $proceso;
        }

        $proceso = ProcesoTransferencia::query()
            ->where('estado', 'abierto')
            ->latest('id')
            ->first();

        if ($proceso === null) {
            $this->error('No hay un proceso de transferencia abierto. Cree uno o indique --proceso=ID.');
        }

        return $proceso;
    }
}

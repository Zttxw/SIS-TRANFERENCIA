<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\FuenteDato;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Reconcilia las dependencias duplicadas que la ingesta SIGA creó antes de
 * materializar el empate `codigo_siga` (ver MapeoDependenciasSigaSeeder).
 *
 * Para cada dependencia de fuente SIGA cuyo código jerárquico (columna `codigo`,
 * ej. 01.03.07.04) coincide con el `codigo_siga` de una dependencia maestra del
 * SGD, reapunta sus bienes y servidores a la maestra y soft-borra la duplicada.
 * Idempotente: si no hay duplicados, no hace nada.
 *
 * Requiere haber corrido antes la migración `add_codigo_siga_to_dependencias`
 * y el `MapeoDependenciasSigaSeeder`.
 */
class ReconciliarDependenciasSiga extends Command
{
    protected $signature = 'dependencias:reconciliar-siga
        {--proceso= : ID o año del proceso (por defecto, el abierto más reciente)}
        {--limpiar-vacias : Soft-borrar también las dependencias SIGA sin bienes, servidores ni hijas}
        {--dry-run : Mostrar qué se haría sin modificar datos}
        {--sin-confirmar : Omitir confirmación interactiva}';

    protected $description = 'Fusiona dependencias SIGA duplicadas hacia su maestra del SGD por codigo_siga';

    public function handle(): int
    {
        $proceso = $this->resolverProceso();
        if ($proceso === null) {
            $this->error('No se encontró ningún proceso de transferencia.');

            return self::FAILURE;
        }

        $dryRun = (bool) $this->option('dry-run');

        // Maestras del SGD indexadas por su codigo_siga.
        $maestrasPorSiga = Dependencia::query()
            ->where('proceso_transferencia_id', $proceso->id)
            ->where('fuente', FuenteDato::SGD->value)
            ->whereNotNull('codigo_siga')
            ->pluck('id', 'codigo_siga');

        // Dependencias SIGA duplicadas: su código jerárquico (columna `codigo`)
        // coincide con el `codigo_siga` de una maestra del SGD.
        $duplicadas = Dependencia::query()
            ->where('proceso_transferencia_id', $proceso->id)
            ->where('fuente', FuenteDato::SIGA->value)
            ->whereIn('codigo', $maestrasPorSiga->keys())
            ->get(['id', 'codigo', 'nombre']);

        $this->info('=== RECONCILIACIÓN DE DEPENDENCIAS SIGA ===');
        $this->line("• Proceso: #{$proceso->id} — {$proceso->nombre}");
        $this->line('• Dependencias SIGA duplicadas a fusionar: '.$duplicadas->count());

        if ($duplicadas->isNotEmpty()) {
            $resumen = [];
            foreach ($duplicadas as $dup) {
                $maestraId = $maestrasPorSiga->get($dup->codigo);
                $nBienes = DB::table('bienes_patrimoniales')->where('dependencia_id', $dup->id)->whereNull('deleted_at')->count();
                $nServidores = DB::table('servidores')->where('dependencia_id', $dup->id)->whereNull('deleted_at')->count();
                $resumen[] = [$dup->codigo, "#{$dup->id} → #{$maestraId}", $nBienes, $nServidores];
            }
            $this->table(['codigo (siga)', 'dup → maestra', 'bienes', 'servidores'], $resumen);
        }

        // Dependencias SIGA sin bienes, servidores ni hijas (nodos padre / vacíos).
        $vacias = $this->option('limpiar-vacias')
            ? $this->dependenciasSigaVacias($proceso->id)
            : collect();

        if ($this->option('limpiar-vacias')) {
            $this->line('• Dependencias SIGA vacías a soft-borrar: '.$vacias->count());
        }

        if ($duplicadas->isEmpty() && $vacias->isEmpty()) {
            $this->info('Nada que reconciliar ni limpiar. Base ya consistente.');

            return self::SUCCESS;
        }

        if ($dryRun) {
            $this->comment('Dry-run: no se modificó ningún dato.');

            return self::SUCCESS;
        }

        if (! $this->option('sin-confirmar')
            && ! $this->confirm('¿Reapuntar bienes/servidores, soft-borrar duplicadas'.($vacias->isNotEmpty() ? ' y vacías' : '').'?', true)) {
            $this->line('Reconciliación cancelada.');

            return self::SUCCESS;
        }

        try {
            $bienesMovidos = 0;
            $servidoresMovidos = 0;
            $borradas = 0;
            $vaciasBorradas = 0;

            DB::transaction(function () use ($duplicadas, $vacias, $maestrasPorSiga, &$bienesMovidos, &$servidoresMovidos, &$borradas, &$vaciasBorradas) {
                foreach ($duplicadas as $dup) {
                    $maestraId = $maestrasPorSiga->get($dup->codigo);

                    $bienesMovidos += DB::table('bienes_patrimoniales')
                        ->where('dependencia_id', $dup->id)
                        ->update(['dependencia_id' => $maestraId]);

                    $servidoresMovidos += DB::table('servidores')
                        ->where('dependencia_id', $dup->id)
                        ->update(['dependencia_id' => $maestraId]);

                    // Soft-delete de la duplicada.
                    Dependencia::where('id', $dup->id)->delete();
                    $borradas++;
                }

                foreach ($vacias as $vac) {
                    Dependencia::where('id', $vac->id)->delete();
                    $vaciasBorradas++;
                }
            });

            $this->newLine();
            $this->info('✔ Reconciliación completada.');
            $this->table(['Métrica', 'Valor'], [
                ['Bienes reapuntados', $bienesMovidos],
                ['Servidores reapuntados', $servidoresMovidos],
                ['Dependencias SIGA duplicadas soft-borradas', $borradas],
                ['Dependencias SIGA vacías soft-borradas', $vaciasBorradas],
            ]);

            return self::SUCCESS;
        } catch (Throwable $e) {
            $this->newLine();
            $this->error('✘ Error durante la reconciliación:');
            $this->error($e->getMessage());

            return self::FAILURE;
        }
    }

    /**
     * Dependencias de fuente SIGA sin bienes, sin servidores y sin hijas.
     *
     * @return \Illuminate\Support\Collection<int, \stdClass>
     */
    private function dependenciasSigaVacias(int $procesoId): \Illuminate\Support\Collection
    {
        $siga = Dependencia::query()
            ->where('proceso_transferencia_id', $procesoId)
            ->where('fuente', FuenteDato::SIGA->value)
            ->get(['id', 'codigo', 'nombre']);

        $conBienes = DB::table('bienes_patrimoniales')->whereNull('deleted_at')->whereNotNull('dependencia_id')->distinct()->pluck('dependencia_id')->flip();
        $conServidores = DB::table('servidores')->whereNull('deleted_at')->whereNotNull('dependencia_id')->distinct()->pluck('dependencia_id')->flip();
        $conHijas = DB::table('dependencias')->whereNull('deleted_at')->whereNotNull('parent_id')->distinct()->pluck('parent_id')->flip();

        return $siga->filter(fn ($d) => ! $conBienes->has($d->id)
            && ! $conServidores->has($d->id)
            && ! $conHijas->has($d->id))->values();
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

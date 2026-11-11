<?php

use App\Modules\Transferencia\Models\FirmaSesion;
use App\Modules\Transferencia\Services\FirmaperuSesionService;
use App\Modules\Transferencia\Services\FirmaperuValidadorService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('firmaperu:validar-pendientes {--id=}', function (FirmaperuSesionService $sesiones, FirmaperuValidadorService $validador): int {
    try {
        $validador->comprobarConfiguracion();
    } catch (Throwable $exception) {
        $this->error($exception->getMessage());

        return 1;
    }
    $correctos = 0;
    $fallos = 0;
    $consulta = FirmaSesion::where('estado', 'pendiente_validacion');
    if ($this->option('id')) {
        $consulta->whereKey($this->option('id'));
    }
    foreach ($consulta->lazyById(50) as $sesion) {
        try {
            $sesiones->validarPendiente($sesion->id);
            $correctos++;
        } catch (Throwable) {
            $fallos++;
            $this->error('No se pudo verificar la sesión '.$sesion->id.'.');
        }
    }
    $this->info("Verificados: {$correctos}. Sin verificar o rechazados: {$fallos}.");

    return $fallos > 0 ? 1 : 0;
})->purpose('Verificar los PDF recibidos cuando ya esté configurada la confianza institucional');

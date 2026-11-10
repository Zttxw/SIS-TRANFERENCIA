<?php

use App\Modules\Acervo\Controllers\AcervoController;
use App\Modules\Auth\Controllers\ActivacionController;
use App\Modules\Auth\Controllers\AuthController;
use App\Modules\Gestion\Controllers\GestionController;
use App\Modules\NoPatrimonial\Controllers\NoPatrimonialController;
use App\Modules\Organization\Controllers\DependenciaController;
use App\Modules\Patrimonio\Controllers\PatrimonioController;
use App\Modules\Personal\Controllers\PersonalController;
use App\Modules\Reportes\Controllers\ReportesController;
use App\Modules\Transferencia\Controllers\TransferenciaController;
use App\Support\Http\EvidenciaController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Autenticación por DNI + contraseña (plan §5).
Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    Route::get('/user', fn (Request $request) => $request->user());

    // Catálogo de dependencias y centros de costo. Consultable por cualquier
    // cuenta con acceso a anexos (precisa ubicar su ámbito).
    Route::middleware('permiso:anexos.ver')->group(function () {
        Route::get('/dependencias', [DependenciaController::class, 'index']);
        Route::get('/dependencias/{id}', [DependenciaController::class, 'show']);
    });

    // Padrón de servidores y activación de cuentas (plan §7.1). Administración.
    Route::middleware('permiso:usuarios.gestionar')->group(function () {
        Route::get('/servidores', [ActivacionController::class, 'index']);
        Route::post('/servidores/{servidor}/preparar-activacion', [ActivacionController::class, 'preparar']);
        Route::post('/servidores/{servidor}/activar', [ActivacionController::class, 'activar']);
    });

    // Anexo 02: Informe de Gestión por Centro de Costo (plan §7.2).
    Route::prefix('gestion')->group(function () {
        Route::get('/informe', [GestionController::class, 'show'])->middleware('permiso:anexos.ver');
        Route::post('/informe', [GestionController::class, 'store'])->middleware('permiso:anexos.registrar');
        Route::get('/informe/pdf', [GestionController::class, 'pdf'])->middleware('permiso:anexos.ver');
    });

    // Anexo 03: Acervo Documental Físico y Digital (plan §7.3).
    Route::prefix('acervo')->group(function () {
        Route::get('/', [AcervoController::class, 'index'])->middleware('permiso:anexos.ver');
        Route::get('/pdf', [AcervoController::class, 'pdf'])->middleware('permiso:anexos.ver');
        Route::post('/', [AcervoController::class, 'store'])->middleware('permiso:anexos.registrar');
        Route::put('/{id}', [AcervoController::class, 'update'])->middleware('permiso:anexos.registrar');
        Route::delete('/{id}', [AcervoController::class, 'destroy'])->middleware('permiso:anexos.registrar');
    });

    // Anexo 04: Inventario Patrimonial y Verificación física (plan §4.2, §7.4).
    Route::prefix('patrimonio')->group(function () {
        Route::get('/resumen', [PatrimonioController::class, 'resumen'])->middleware('permiso:anexos.ver,reportes.ver');
        Route::get('/pdf', [PatrimonioController::class, 'pdf'])->middleware('permiso:anexos.ver');
        Route::get('/bienes', [PatrimonioController::class, 'index'])->middleware('permiso:anexos.ver');
        Route::get('/bienes/{id}', [PatrimonioController::class, 'show'])->middleware('permiso:anexos.ver');
        Route::post('/bienes/{id}/verificar', [PatrimonioController::class, 'verificar'])->middleware('permiso:bienes.verificar');
    });

    // Anexo 05: Personal a Cargo (plan §7.5).
    Route::prefix('personal')->group(function () {
        Route::get('/', [PersonalController::class, 'index'])->middleware('permiso:anexos.ver');
        Route::get('/pdf', [PersonalController::class, 'pdf'])->middleware('permiso:anexos.ver');
        Route::post('/', [PersonalController::class, 'store'])->middleware('permiso:anexos.registrar');
        Route::delete('/{id}', [PersonalController::class, 'destroy'])->middleware('permiso:anexos.registrar');
    });

    // Anexo 06: Bienes No Patrimoniales (plan §7.6).
    Route::prefix('nopatrimonial')->group(function () {
        Route::get('/', [NoPatrimonialController::class, 'index'])->middleware('permiso:anexos.ver');
        Route::get('/pdf', [NoPatrimonialController::class, 'pdf'])->middleware('permiso:anexos.ver');
        Route::post('/', [NoPatrimonialController::class, 'store'])->middleware('permiso:anexos.registrar');
        Route::put('/{id}', [NoPatrimonialController::class, 'update'])->middleware('permiso:anexos.registrar');
        Route::delete('/{id}', [NoPatrimonialController::class, 'destroy'])->middleware('permiso:anexos.registrar');
    });

    // Apoyo a la generación de anexos: avance institucional (tablero), avance de
    // una dependencia (estado) y Acta (Anexo 07). El flujo de remisión lo lleva el SGD.
    Route::prefix('transferencia')->group(function () {
        Route::get('/tablero', [TransferenciaController::class, 'tablero'])->middleware('permiso:anexos.ver');
        Route::get('/estado', [TransferenciaController::class, 'estado'])->middleware('permiso:anexos.ver');
        Route::get('/acta', [TransferenciaController::class, 'acta'])->middleware('permiso:actas.generar');
        Route::get('/acta/pdf', [TransferenciaController::class, 'actaPdf'])->middleware('permiso:actas.generar');
    });

    // Reportes de avance y exportación (matriz de anexos, conciliación patrimonial).
    // La vista requiere reportes.ver; la descarga Excel/PDF requiere reportes.exportar.
    Route::prefix('reportes')->group(function () {
        Route::get('/{reporte}', [ReportesController::class, 'mostrar'])->middleware('permiso:reportes.ver');
        Route::get('/{reporte}/export', [ReportesController::class, 'exportar'])->middleware('permiso:reportes.exportar');
    });

    // Storage Seguro de Evidencias Documentales y Fotográficas (plan §9).
    Route::prefix('evidencias')->group(function () {
        Route::post('/', [EvidenciaController::class, 'store'])->middleware('permiso:anexos.registrar');
        Route::get('/{id}/descargar', [EvidenciaController::class, 'download'])->middleware('permiso:anexos.ver');
    });
});

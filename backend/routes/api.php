<?php

use App\Modules\Acervo\Controllers\AcervoController;
use App\Modules\Auth\Controllers\ActivacionController;
use App\Modules\Auth\Controllers\AuthController;
use App\Modules\Documentos\Controllers\DocumentoPendienteController;
use App\Modules\Gestion\Controllers\GestionController;
use App\Modules\NoPatrimonial\Controllers\NoPatrimonialController;
use App\Modules\Organization\Controllers\DependenciaController;
use App\Modules\Patrimonio\Controllers\PatrimonioController;
use App\Modules\Personal\Controllers\PersonalController;
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

    // Catálogo de dependencias y centros de costo.
    Route::get('/dependencias', [DependenciaController::class, 'index']);
    Route::get('/dependencias/{id}', [DependenciaController::class, 'show']);

    // Padrón de servidores y activación de cuentas (plan §7.1).
    Route::get('/servidores', [ActivacionController::class, 'index']);
    Route::post('/servidores/{servidor}/preparar-activacion', [ActivacionController::class, 'preparar']);
    Route::post('/servidores/{servidor}/activar', [ActivacionController::class, 'activar']);

    // Anexo 01: Reporte de Asuntos Pendientes y Prioritarios (SGD) (plan §7.7).
    Route::prefix('documentos-pendientes')->group(function () {
        Route::get('/', [DocumentoPendienteController::class, 'index']);
        Route::get('/resumen', [DocumentoPendienteController::class, 'resumen']);
        Route::post('/', [DocumentoPendienteController::class, 'store']);
        Route::put('/{id}', [DocumentoPendienteController::class, 'update']);
        Route::delete('/{id}', [DocumentoPendienteController::class, 'destroy']);
    });

    // Anexo 02: Informe de Gestión por Centro de Costo (plan §7.2).
    Route::prefix('gestion')->group(function () {
        Route::get('/informe', [GestionController::class, 'show']);
        Route::post('/informe', [GestionController::class, 'store']);
    });

    // Anexo 03: Acervo Documental Físico y Digital (plan §7.3).
    Route::prefix('acervo')->group(function () {
        Route::get('/', [AcervoController::class, 'index']);
        Route::post('/', [AcervoController::class, 'store']);
        Route::put('/{id}', [AcervoController::class, 'update']);
        Route::delete('/{id}', [AcervoController::class, 'destroy']);
    });

    // Anexo 04: Inventario Patrimonial y Verificación física (plan §4.2, §7.4).
    Route::prefix('patrimonio')->group(function () {
        Route::get('/resumen', [PatrimonioController::class, 'resumen']);
        Route::get('/bienes', [PatrimonioController::class, 'index']);
        Route::get('/bienes/{id}', [PatrimonioController::class, 'show']);
        Route::post('/bienes/{id}/verificar', [PatrimonioController::class, 'verificar']);
    });

    // Anexo 05: Personal a Cargo (plan §7.5).
    Route::prefix('personal')->group(function () {
        Route::get('/', [PersonalController::class, 'index']);
        Route::post('/', [PersonalController::class, 'store']);
        Route::delete('/{id}', [PersonalController::class, 'destroy']);
    });

    // Anexo 06: Bienes No Patrimoniales (plan §7.6).
    Route::prefix('nopatrimonial')->group(function () {
        Route::get('/', [NoPatrimonialController::class, 'index']);
        Route::post('/', [NoPatrimonialController::class, 'store']);
        Route::put('/{id}', [NoPatrimonialController::class, 'update']);
        Route::delete('/{id}', [NoPatrimonialController::class, 'destroy']);
    });

    // Anexo 07: Entrega Jerárquica y Acta de Transferencia (plan §7.8, §7.10).
    Route::prefix('transferencia')->group(function () {
        Route::get('/estado', [TransferenciaController::class, 'estado']);
        Route::post('/remitir', [TransferenciaController::class, 'remitir']);
        Route::get('/acta', [TransferenciaController::class, 'acta']);
    });

    // Storage Seguro de Evidencias Documentales y Fotográficas (plan §9).
    Route::prefix('evidencias')->group(function () {
        Route::post('/', [EvidenciaController::class, 'store']);
        Route::get('/{id}/descargar', [EvidenciaController::class, 'download']);
    });
});

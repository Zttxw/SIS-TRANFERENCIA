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
use App\Modules\Transferencia\Controllers\ObservacionController;
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

    // Anexo 01: Reporte de Asuntos Pendientes y Prioritarios (SGD) (plan §7.7).
    Route::prefix('documentos-pendientes')->group(function () {
        Route::get('/', [DocumentoPendienteController::class, 'index'])->middleware('permiso:anexos.ver');
        Route::get('/resumen', [DocumentoPendienteController::class, 'resumen'])->middleware('permiso:anexos.ver,reportes.ver');
        Route::post('/', [DocumentoPendienteController::class, 'store'])->middleware('permiso:anexos.registrar');
        Route::put('/{id}', [DocumentoPendienteController::class, 'update'])->middleware('permiso:anexos.registrar');
        Route::delete('/{id}', [DocumentoPendienteController::class, 'destroy'])->middleware('permiso:anexos.registrar');
    });

    // Anexo 02: Informe de Gestión por Centro de Costo (plan §7.2).
    Route::prefix('gestion')->group(function () {
        Route::get('/informe', [GestionController::class, 'show'])->middleware('permiso:anexos.ver');
        Route::post('/informe', [GestionController::class, 'store'])->middleware('permiso:anexos.registrar');
    });

    // Anexo 03: Acervo Documental Físico y Digital (plan §7.3).
    Route::prefix('acervo')->group(function () {
        Route::get('/', [AcervoController::class, 'index'])->middleware('permiso:anexos.ver');
        Route::post('/', [AcervoController::class, 'store'])->middleware('permiso:anexos.registrar');
        Route::put('/{id}', [AcervoController::class, 'update'])->middleware('permiso:anexos.registrar');
        Route::delete('/{id}', [AcervoController::class, 'destroy'])->middleware('permiso:anexos.registrar');
    });

    // Anexo 04: Inventario Patrimonial y Verificación física (plan §4.2, §7.4).
    Route::prefix('patrimonio')->group(function () {
        Route::get('/resumen', [PatrimonioController::class, 'resumen'])->middleware('permiso:anexos.ver,reportes.ver');
        Route::get('/bienes', [PatrimonioController::class, 'index'])->middleware('permiso:anexos.ver');
        Route::get('/bienes/{id}', [PatrimonioController::class, 'show'])->middleware('permiso:anexos.ver');
        Route::post('/bienes/{id}/verificar', [PatrimonioController::class, 'verificar'])->middleware('permiso:bienes.verificar');
    });

    // Anexo 05: Personal a Cargo (plan §7.5).
    Route::prefix('personal')->group(function () {
        Route::get('/', [PersonalController::class, 'index'])->middleware('permiso:anexos.ver');
        Route::post('/', [PersonalController::class, 'store'])->middleware('permiso:anexos.registrar');
        Route::delete('/{id}', [PersonalController::class, 'destroy'])->middleware('permiso:anexos.registrar');
    });

    // Anexo 06: Bienes No Patrimoniales (plan §7.6).
    Route::prefix('nopatrimonial')->group(function () {
        Route::get('/', [NoPatrimonialController::class, 'index'])->middleware('permiso:anexos.ver');
        Route::post('/', [NoPatrimonialController::class, 'store'])->middleware('permiso:anexos.registrar');
        Route::put('/{id}', [NoPatrimonialController::class, 'update'])->middleware('permiso:anexos.registrar');
        Route::delete('/{id}', [NoPatrimonialController::class, 'destroy'])->middleware('permiso:anexos.registrar');
    });

    // Anexo 07: Entrega Jerárquica y Acta de Transferencia (plan §7.8, §7.10).
    Route::prefix('transferencia')->group(function () {
        Route::get('/estado', [TransferenciaController::class, 'estado'])->middleware('permiso:anexos.ver');
        Route::post('/remitir', [TransferenciaController::class, 'remitir'])->middleware('permiso:entregas.remitir');
        Route::post('/revisar', [TransferenciaController::class, 'revisar'])->middleware('permiso:entregas.revisar');
        Route::get('/acta', [TransferenciaController::class, 'acta'])->middleware('permiso:actas.generar');
    });

    // Observaciones y subsanaciones sobre los anexos (plan §7.9).
    Route::prefix('observaciones')->group(function () {
        Route::get('/', [ObservacionController::class, 'index'])->middleware('permiso:anexos.ver');
        Route::post('/', [ObservacionController::class, 'store'])->middleware('permiso:observaciones.registrar');
        Route::post('/{id}/subsanar', [ObservacionController::class, 'subsanar'])->middleware('permiso:observaciones.subsanar');
        Route::post('/{id}/desestimar', [ObservacionController::class, 'desestimar'])->middleware('permiso:observaciones.registrar');
    });

    // Storage Seguro de Evidencias Documentales y Fotográficas (plan §9).
    Route::prefix('evidencias')->group(function () {
        Route::post('/', [EvidenciaController::class, 'store'])->middleware('permiso:anexos.registrar');
        Route::get('/{id}/descargar', [EvidenciaController::class, 'download'])->middleware('permiso:anexos.ver');
    });
});

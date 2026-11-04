<?php

use App\Modules\Auth\Controllers\ActivacionController;
use App\Modules\Auth\Controllers\AuthController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Autenticación por DNI + contraseña (plan §5).
Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    Route::get('/user', fn (Request $request) => $request->user());

    // Padrón de servidores y activación de cuentas (plan §7.1). Requiere el
    // permiso usuarios.gestionar (verificado en el controlador).
    Route::get('/servidores', [ActivacionController::class, 'index']);
    Route::post('/servidores/{servidor}/preparar-activacion', [ActivacionController::class, 'preparar']);
    Route::post('/servidores/{servidor}/activar', [ActivacionController::class, 'activar']);
});

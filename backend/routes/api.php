<?php

use App\Modules\Acervo\Controllers\AcervoController;
use App\Modules\Auth\Controllers\ActivacionController;
use App\Modules\Auth\Controllers\AuthController;
use App\Modules\Auth\Controllers\DelegadoController;
use App\Modules\Auth\Controllers\GestionUsuariosController;
use App\Modules\Documentos\Controllers\DocumentoPendienteController;
use App\Modules\Expediente\Controllers\ExpedienteController;
use App\Modules\Gestion\Controllers\GestionController;
use App\Modules\NoPatrimonial\Controllers\NoPatrimonialController;
use App\Modules\Organization\Controllers\DependenciaController;
use App\Modules\Patrimonio\Controllers\PatrimonioController;
use App\Modules\Personal\Controllers\PersonalController;
use App\Modules\Reportes\Controllers\ReportesController;
use App\Modules\Transferencia\Controllers\ConstanciaAusenciaController;
use App\Modules\Transferencia\Controllers\CronogramaController;
use App\Modules\Transferencia\Controllers\FirmaperuClienteController;
use App\Modules\Transferencia\Controllers\FirmaperuController;
use App\Modules\Transferencia\Controllers\ObservacionController;
use App\Modules\Transferencia\Controllers\TransferenciaController;
use App\Support\Http\EvidenciaController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Autenticación por DNI + contraseña (plan §5).
Route::post('/auth/login', [AuthController::class, 'login']);

Route::get('/firmaperu/cliente/{archivo}', [FirmaperuClienteController::class, 'archivo'])
    ->where('archivo', '.+')->middleware('throttle:300,1');

Route::prefix('firmaperu')->middleware('throttle:60,1')->group(function () {
    Route::post('/param', [FirmaperuController::class, 'param']);
    Route::get('/documento/{token}', [FirmaperuController::class, 'documento'])->where('token', '[A-Za-z0-9]{64}');
    Route::post('/subir-firmado/{token}', [FirmaperuController::class, 'subir'])->where('token', '[A-Za-z0-9]{64}');
});

Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('firmaperu')->group(function () {
        Route::post('/preparar', [FirmaperuController::class, 'preparar'])->middleware('permiso:anexos.registrar,firmas.firmar,actas.generar')->middleware('throttle:10,1,firma-preparar');
        Route::post('/generar-borrador', [FirmaperuController::class, 'generarBorrador'])->middleware('permiso:anexos.registrar,actas.generar')->middleware('throttle:20,1,firma-generar');
        Route::middleware('permiso:anexos.ver')->group(function () {
            Route::get('/previsualizar', [FirmaperuController::class, 'previsualizar'])->middleware('throttle:20,1,firma-visualizar');
            Route::get('/requisitos-remision/{dependenciaId}', [FirmaperuController::class, 'requisitosRemision'])->whereNumber('dependenciaId');
            Route::get('/sesiones/{id}', [FirmaperuController::class, 'sesion'])->whereUuid('id');
            Route::get('/estado/{tipo}/{dependenciaId}', [FirmaperuController::class, 'estado'])->whereNumber('dependenciaId');
            Route::get('/documentos/{id}/descargar', [FirmaperuController::class, 'descargar'])->whereUuid('id');
            Route::get('/documentos/{id}/ver', [FirmaperuController::class, 'verFirmado'])->whereUuid('id');
            Route::get('/documentos/{id}/recibido', [FirmaperuController::class, 'descargarRecibido'])->whereUuid('id');
        });
    });
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    Route::get('/user', fn (Request $request) => $request->user());

    // Catálogo de dependencias y centros de costo. Consultable por cualquier
    // cuenta con acceso a anexos (precisa ubicar su ámbito).
    Route::get('/dependencias/organigrama', [DependenciaController::class, 'organigrama'])->middleware('permiso:anexos.ver,usuarios.gestionar');
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

    // Administración de cuentas y roles institucionales (roles.gestionar).
    // Alta de usuarios externos al padrón SGD (ETTE/personal externo) y
    // asignación/revocación de roles institucionales a cuentas existentes.
    Route::prefix('usuarios')->middleware('permiso:roles.gestionar')->group(function () {
        Route::get('/', [GestionUsuariosController::class, 'index']);
        Route::get('/roles-asignables', [GestionUsuariosController::class, 'rolesAsignables']);
        Route::post('/externos', [GestionUsuariosController::class, 'crearExterno']);
        Route::post('/{user}/roles', [GestionUsuariosController::class, 'asignarRol']);
        Route::delete('/roles/{asignacion}', [GestionUsuariosController::class, 'revocarRol'])->whereNumber('asignacion');
    });

    // Gestión de delegados ETTE por el comité (RF-008). Alta/designación/
    // revocación limitadas al equipo (delegados.gestionar), no es administrar
    // usuarios/roles institucionales.
    Route::prefix('delegados')->middleware('permiso:delegados.gestionar')->group(function () {
        Route::get('/', [DelegadoController::class, 'index']);
        Route::get('/candidatos', [DelegadoController::class, 'candidatos']);
        Route::post('/', [DelegadoController::class, 'store']);
        Route::delete('/{id}', [DelegadoController::class, 'destroy']);
    });

    // Anexo 01: Reporte de Asuntos Pendientes y Prioritarios (SGD) (plan §7.7).
    Route::prefix('documentos-pendientes')->group(function () {
        Route::get('/', [DocumentoPendienteController::class, 'index'])->middleware('permiso:anexos.ver');
        Route::get('/resumen', [DocumentoPendienteController::class, 'resumen'])->middleware('permiso:anexos.ver,reportes.ver');
        Route::get('/drilldown', [DocumentoPendienteController::class, 'drilldown'])->middleware('permiso:anexos.ver,reportes.ver');
        Route::post('/', [DocumentoPendienteController::class, 'store'])->middleware('permiso:anexos.registrar');
        Route::put('/{id}', [DocumentoPendienteController::class, 'update'])->middleware('permiso:anexos.registrar');
        Route::delete('/{id}', [DocumentoPendienteController::class, 'destroy'])->middleware('permiso:anexos.registrar');
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
        // Exploración en vivo de los documentos del SGD de una fila-resumen digital.
        Route::get('/{id}/documentos', [AcervoController::class, 'documentosSgd'])
            ->whereNumber('id')->middleware('permiso:anexos.ver');
        Route::get('/{id}/documentos/{emi}/pdf', [AcervoController::class, 'documentoSgdPdf'])
            ->whereNumber('id')->where('emi', '[0-9]+')->middleware('permiso:anexos.ver');
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

    // Anexo 07: Entrega Jerárquica y Acta de Transferencia (plan §7.8, §7.10).
    Route::prefix('transferencia')->group(function () {
        Route::get('/tablero', [TransferenciaController::class, 'tablero'])->middleware('permiso:anexos.ver');
        Route::get('/entregas', [TransferenciaController::class, 'index'])->middleware('permiso:anexos.ver');
        Route::get('/estado', [TransferenciaController::class, 'estado'])->middleware('permiso:anexos.ver');
        Route::post('/remitir', [TransferenciaController::class, 'remitir'])->middleware('permiso:entregas.remitir');
        Route::post('/revisar', [TransferenciaController::class, 'revisar'])->middleware('permiso:entregas.revisar');
        Route::get('/acta', [TransferenciaController::class, 'acta'])->middleware('permiso:actas.generar,firmas.firmar');
        Route::get('/acta/pdf', [TransferenciaController::class, 'actaPdf'])->middleware('permiso:actas.generar,firmas.firmar');
    });

    // Constancia de ausencia de firma ETTE + copia digital (RF-004/005, D-12).
    // Consulta con anexos.ver; el registro lo hace el responsable del centro de
    // costo (firmas.constancia_ausencia). La ausencia no bloquea el flujo.
    Route::prefix('firmas')->group(function () {
        Route::get('/ausencia-ette', [ConstanciaAusenciaController::class, 'index'])->middleware('permiso:anexos.ver');
        Route::post('/ausencia-ette', [ConstanciaAusenciaController::class, 'store'])->middleware('permiso:firmas.constancia_ausencia');
    });

    // Cronograma del proceso (RF-007, C-03). Consulta con anexos.ver; la
    // modificación la reservan administrador y ETTS (cronograma.gestionar).
    Route::prefix('cronograma')->group(function () {
        Route::get('/', [CronogramaController::class, 'index'])->middleware('permiso:anexos.ver,cronograma.gestionar');
        Route::post('/', [CronogramaController::class, 'store'])->middleware('permiso:cronograma.gestionar');
        Route::put('/{id}', [CronogramaController::class, 'update'])->middleware('permiso:cronograma.gestionar');
        Route::delete('/{id}', [CronogramaController::class, 'destroy'])->middleware('permiso:cronograma.gestionar');
    });

    // Expediente de entrega: paquete PDF único con todos los anexos (F5).
    Route::get('/expediente/pdf', [ExpedienteController::class, 'pdf'])->middleware('permiso:expediente.ver');

    // Reportes consolidados y exportación (plan §7.11, F5). La vista requiere
    // reportes.ver; la descarga Excel/PDF requiere reportes.exportar.
    Route::prefix('reportes')->group(function () {
        Route::get('/{reporte}', [ReportesController::class, 'mostrar'])->middleware('permiso:reportes.ver');
        Route::get('/{reporte}/export', [ReportesController::class, 'exportar'])->middleware('permiso:reportes.exportar');
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

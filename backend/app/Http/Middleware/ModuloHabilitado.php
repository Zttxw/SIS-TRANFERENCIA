<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Support\Http\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Responde 404 si el módulo está apagado en `config/modulos.php`.
 *
 * Uso en rutas: ->middleware('modulo:documentos_pendientes')
 */
class ModuloHabilitado
{
    public function handle(Request $request, Closure $next, string $modulo): Response
    {
        if (! config("modulos.{$modulo}", false)) {
            return ApiResponse::error('Este módulo no está habilitado.', 404);
        }

        return $next($request);
    }
}

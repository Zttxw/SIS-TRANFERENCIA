<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\User;
use App\Support\Enums\Permiso;
use App\Support\Http\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Exige que el usuario autenticado posea al menos uno de los permisos indicados
 * (plan §5, RN-14). El permiso se resuelve contra el catálogo materializado
 * `rol_permiso` vía User::tienePermiso(); el ámbito (dependencia) lo acotan las
 * policies/servicios, no este middleware.
 *
 * Uso en rutas: ->middleware('permiso:anexos.registrar')
 * Varios permisos (OR): ->middleware('permiso:anexos.ver,reportes.ver')
 */
class VerificarPermiso
{
    public function handle(Request $request, Closure $next, string ...$codigos): Response
    {
        /** @var User|null $usuario */
        $usuario = $request->user();

        if ($usuario === null) {
            return ApiResponse::error('No autenticado.', 401);
        }

        if (! $usuario->activo) {
            return ApiResponse::error('La cuenta está inactiva.', 403);
        }

        foreach ($codigos as $codigo) {
            $permiso = Permiso::tryFrom($codigo);

            if ($permiso === null) {
                // Error de programación: la ruta declara un permiso inexistente.
                return ApiResponse::error("Permiso desconocido: {$codigo}.", 500);
            }

            if ($usuario->tienePermiso($permiso)) {
                return $next($request);
            }
        }

        return ApiResponse::error('No tiene permiso para realizar esta acción.', 403);
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\Auth\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Auth\Requests\LoginRequest;
use App\Modules\Auth\Services\AutenticacionService;
use App\Support\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(private readonly AutenticacionService $auth) {}

    /**
     * Inicia sesión con DNI y contraseña; devuelve un token Sanctum.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $resultado = $this->auth->login(
            $request->dni(),
            (string) $request->string('password'),
            $request->nombreDispositivo(),
        );

        return ApiResponse::success([
            'token' => $resultado['token'],
            'usuario' => $this->perfil($resultado['usuario']),
        ], 'Sesión iniciada.');
    }

    /**
     * Cierra la sesión actual revocando el token usado.
     */
    public function logout(Request $request): JsonResponse
    {
        /** @var User $usuario */
        $usuario = $request->user();
        $this->auth->logout($usuario);

        return ApiResponse::success(null, 'Sesión cerrada.');
    }

    /**
     * Perfil del usuario autenticado: roles y servidor/dependencia vinculados.
     */
    public function me(Request $request): JsonResponse
    {
        /** @var User $usuario */
        $usuario = $request->user();

        return ApiResponse::success($this->perfil($usuario));
    }

    /**
     * @return array<string, mixed>
     */
    private function perfil(User $usuario): array
    {
        $usuario->load([
            'asignacionesRol:id,user_id,dependencia_id,rol',
            'asignacionesRol.dependencia:id,parent_id,proceso_transferencia_id',
            'servidor:id,dependencia_id,dni,nombres,apellidos,cargo,es_responsable',
            'servidor.dependencia:id,codigo,nombre,nivel',
        ]);

        return [
            'id' => $usuario->id,
            'dni' => $usuario->dni,
            'nombre' => $usuario->name,
            'email' => $usuario->email,
            'activo' => $usuario->activo,
            'es_global' => $usuario->tieneAmbitoGlobal(),
            'dependencias_ambito' => $usuario->dependenciasEnAmbito(),
            'roles' => $usuario->asignacionesRol->map(fn ($a) => [
                'rol' => $a->rol->value,
                'etiqueta' => $a->rol->etiqueta(),
                'dependencia_id' => $a->dependencia_id,
            ])->values(),
            'servidor' => $usuario->servidor,
        ];
    }
}

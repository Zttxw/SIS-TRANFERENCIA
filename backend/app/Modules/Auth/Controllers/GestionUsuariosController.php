<?php

declare(strict_types=1);

namespace App\Modules\Auth\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Auth\Services\GestionUsuariosService;
use App\Support\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Administración de cuentas y roles institucionales (permiso roles.gestionar).
 * Cubre el alta de usuarios externos al padrón SGD (ETTE, personal externo) y la
 * asignación/revocación de roles institucionales a cuentas existentes.
 *
 * El padrón de servidores y su activación siguen en {@see ActivacionController}
 * (permiso usuarios.gestionar); los delegados ETTE del comité, en
 * {@see DelegadoController} (permiso delegados.gestionar).
 */
class GestionUsuariosController extends Controller
{
    public function __construct(private readonly GestionUsuariosService $usuarios) {}

    /**
     * Lista todas las cuentas (de padrón y externas) con sus roles.
     */
    public function index(Request $request): JsonResponse
    {
        $buscar = trim((string) $request->query('buscar', ''));

        $cuentas = $this->usuarios->listar($buscar);

        return ApiResponse::paginated($cuentas, 'Cuentas recuperadas con éxito.');
    }

    /**
     * Catálogo de roles asignables desde este panel, con su etiqueta y si
     * requieren dependencia.
     */
    public function rolesAsignables(): JsonResponse
    {
        return ApiResponse::success($this->usuarios->rolesAsignables(), 'Roles asignables.');
    }

    /**
     * Da de alta una cuenta para una persona externa al padrón SGD.
     */
    public function crearExterno(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'dni' => ['required', 'string', 'regex:/^[0-9]{8,15}$/'],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:8'],
            'rol' => ['nullable', 'string'],
            'dependencia_id' => ['nullable', 'integer', 'exists:dependencias,id'],
        ]);

        $usuario = $this->usuarios->crearExterno($datos);

        return ApiResponse::success(
            ['user_id' => $usuario->id, 'dni' => $usuario->dni, 'nombre' => $usuario->name],
            'Usuario externo creado.',
            201,
        );
    }

    /**
     * Asigna un rol institucional a una cuenta existente.
     */
    public function asignarRol(Request $request, User $user): JsonResponse
    {
        $datos = $request->validate([
            'rol' => ['required', 'string'],
            'dependencia_id' => ['nullable', 'integer', 'exists:dependencias,id'],
        ]);

        $asignacion = $this->usuarios->asignarRol(
            $user->id,
            $datos['rol'],
            isset($datos['dependencia_id']) ? (int) $datos['dependencia_id'] : null,
        );

        return ApiResponse::success(
            $asignacion->load(['dependencia:id,codigo,nombre']),
            'Rol asignado a la cuenta.',
            201,
        );
    }

    /**
     * Revoca una asignación de rol institucional.
     */
    public function revocarRol(int $asignacion): JsonResponse
    {
        $revocado = $this->usuarios->revocarRol($asignacion);

        if (! $revocado) {
            return ApiResponse::error('La asignación de rol no existe o no puede revocarse desde este panel.', 404);
        }

        return ApiResponse::success(null, 'Rol revocado de la cuenta.');
    }
}

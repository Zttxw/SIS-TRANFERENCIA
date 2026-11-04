<?php

declare(strict_types=1);

namespace App\Modules\Auth\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Auth\Services\PrepararActivacion;
use App\Modules\Organization\Models\Servidor;
use App\Support\Enums\Permiso;
use App\Support\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Padrón de servidores y activación de cuentas (plan §7.1). Todas las acciones
 * requieren el permiso usuarios.gestionar.
 */
class ActivacionController extends Controller
{
    public function __construct(private readonly PrepararActivacion $activacion) {}

    /**
     * Padrón de servidores del proceso, con su estado de cuenta. Permite buscar
     * por DNI, nombres/apellidos o cargo.
     */
    public function index(Request $request): JsonResponse
    {
        $this->autorizar($request);

        $buscar = trim((string) $request->query('buscar', ''));

        $servidores = Servidor::query()
            ->with(['dependencia:id,codigo,nombre', 'cuenta:id,servidor_id,dni,activo'])
            ->when($buscar !== '', function ($q) use ($buscar) {
                $like = '%'.mb_strtolower($buscar).'%';
                $q->where(function ($q) use ($like) {
                    foreach (['dni', 'nombres', 'apellidos', 'cargo'] as $campo) {
                        $q->orWhereRaw("lower({$campo}) like ?", [$like]);
                    }
                });
            })
            ->orderBy('apellidos')
            ->orderBy('nombres')
            ->paginate(25)
            ->withQueryString();

        return ApiResponse::success($servidores);
    }

    /**
     * Propone los roles que recibiría el servidor al activarse, sin crear nada.
     */
    public function preparar(Request $request, Servidor $servidor): JsonResponse
    {
        $this->autorizar($request);

        return ApiResponse::success($this->activacion->proponer($servidor));
    }

    /**
     * Crea la cuenta del servidor con la contraseña indicada y asigna los roles.
     */
    public function activar(Request $request, Servidor $servidor): JsonResponse
    {
        $this->autorizar($request);

        $datos = $request->validate([
            'password' => ['required', 'string', 'min:8'],
        ]);

        $usuario = $this->activacion->activar($servidor, $datos['password']);

        return ApiResponse::success(
            ['user_id' => $usuario->id, 'dni' => $usuario->dni, 'nombre' => $usuario->name],
            'Cuenta activada.',
            201,
        );
    }

    private function autorizar(Request $request): void
    {
        /** @var User $usuario */
        $usuario = $request->user();

        abort_unless($usuario->tienePermiso(Permiso::GestionarUsuarios), 403, 'No autorizado.');
    }
}

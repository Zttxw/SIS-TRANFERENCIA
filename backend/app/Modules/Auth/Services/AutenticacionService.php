<?php

declare(strict_types=1);

namespace App\Modules\Auth\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Autenticación por DNI + contraseña con emisión de token Sanctum (plan §5,
 * §9). Las cuentas inactivas no pueden iniciar sesión.
 */
class AutenticacionService
{
    /**
     * Verifica credenciales y emite un token personal. Lanza ValidationException
     * con un mensaje genérico para no revelar si el DNI existe.
     *
     * @return array{token: string, usuario: User}
     */
    public function login(string $dni, string $password, string $dispositivo = 'api'): array
    {
        $usuario = User::query()->where('dni', $dni)->first();

        if ($usuario === null || ! Hash::check($password, (string) $usuario->password)) {
            throw ValidationException::withMessages([
                'dni' => 'Las credenciales no son válidas.',
            ]);
        }

        if (! $usuario->activo) {
            throw ValidationException::withMessages([
                'dni' => 'La cuenta está inactiva. Contacte al administrador.',
            ]);
        }

        $token = $usuario->createToken($dispositivo)->plainTextToken;

        return ['token' => $token, 'usuario' => $usuario];
    }

    /**
     * Revoca el token con el que se autenticó la solicitud actual.
     */
    public function logout(User $usuario): void
    {
        $token = $usuario->currentAccessToken();

        if ($token !== null) {
            $token->delete();
        }
    }
}

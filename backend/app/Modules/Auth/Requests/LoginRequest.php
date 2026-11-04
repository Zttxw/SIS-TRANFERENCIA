<?php

declare(strict_types=1);

namespace App\Modules\Auth\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validación del inicio de sesión por DNI y contraseña (plan §5). El usuario
 * es el DNI (8 dígitos); no se usa email para autenticar.
 */
class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'dni' => ['required', 'string', 'regex:/^[0-9]{8}$/'],
            'password' => ['required', 'string'],
            'dispositivo' => ['sometimes', 'string', 'max:120'],
        ];
    }

    public function messages(): array
    {
        return [
            'dni.regex' => 'El DNI debe tener 8 dígitos.',
        ];
    }

    public function dni(): string
    {
        return (string) $this->string('dni');
    }

    public function nombreDispositivo(): string
    {
        $dispositivo = trim((string) $this->input('dispositivo', ''));

        return $dispositivo !== '' ? $dispositivo : 'api';
    }
}

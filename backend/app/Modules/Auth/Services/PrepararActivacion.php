<?php

declare(strict_types=1);

namespace App\Modules\Auth\Services;

use App\Models\User;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Organization\Models\Servidor;
use App\Support\Enums\Rol;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * "Preparar activación": propone y crea la cuenta de acceso de un servidor del
 * padrón SGD (plan §7.1). El SGD indica quién encarga cada dependencia, por lo
 * que un encargado recibe además el rol de responsable de centro de costo.
 *
 * Inspirado en PrepararAccesoSgd del proyecto de referencia, adaptado a nuestro
 * modelo (Servidor separado de User, roles por asignación de ámbito).
 */
class PrepararActivacion
{
    /**
     * Propone roles para el servidor sin crear nada. Valida que sea activable:
     * servidor con DNI de 8 dígitos único en el proceso.
     *
     * @return array{
     *     servidor: Servidor,
     *     tiene_cuenta: bool,
     *     roles: list<array{rol: string, etiqueta: string, dependencia_id: int|null, dependencia: string|null}>
     * }
     */
    public function proponer(Servidor $servidor): array
    {
        if (! preg_match('/^[0-9]{8}$/', (string) $servidor->dni)) {
            throw ValidationException::withMessages([
                'servidor' => 'El servidor debe tener un DNI de 8 dígitos para activarse.',
            ]);
        }

        $duplicados = Servidor::query()
            ->where('proceso_transferencia_id', $servidor->proceso_transferencia_id)
            ->where('dni', $servidor->dni)
            ->count();
        if ($duplicados !== 1) {
            throw ValidationException::withMessages([
                'servidor' => 'El DNI debe ser único en el proceso para activar la cuenta.',
            ]);
        }

        // Todo servidor activable recibe el rol de servidor (ámbito personal).
        $roles = [[
            'rol' => Rol::SERVIDOR->value,
            'etiqueta' => Rol::SERVIDOR->etiqueta(),
            'dependencia_id' => $servidor->dependencia_id,
            'dependencia' => $servidor->dependencia?->nombre,
        ]];

        // Dependencias que este servidor encarga (RN-01): responsable de centro
        // de costo por cada una.
        $encargadas = Dependencia::query()
            ->where('proceso_transferencia_id', $servidor->proceso_transferencia_id)
            ->where('encargado_servidor_id', $servidor->id)
            ->orderBy('codigo')
            ->get(['id', 'codigo', 'nombre']);

        foreach ($encargadas as $dep) {
            $roles[] = [
                'rol' => Rol::RESPONSABLE_CENTRO_COSTO->value,
                'etiqueta' => Rol::RESPONSABLE_CENTRO_COSTO->etiqueta(),
                'dependencia_id' => $dep->id,
                'dependencia' => $dep->nombre,
            ];
        }

        return [
            'servidor' => $servidor,
            'tiene_cuenta' => $servidor->tieneCuenta(),
            'roles' => $roles,
        ];
    }

    /**
     * Crea la cuenta del servidor y asigna los roles propuestos. Idempotente:
     * si el servidor ya tiene cuenta, no la recrea ni reactiva.
     */
    public function activar(Servidor $servidor, string $password): User
    {
        return DB::transaction(function () use ($servidor, $password) {
            $propuesta = $this->proponer($servidor);

            if ($propuesta['tiene_cuenta']) {
                throw ValidationException::withMessages([
                    'servidor' => 'El servidor ya tiene una cuenta de acceso.',
                ]);
            }

            // Un DNI no puede tener dos cuentas, aun entre procesos.
            if (User::query()->where('dni', $servidor->dni)->exists()) {
                throw ValidationException::withMessages([
                    'servidor' => 'Ya existe una cuenta con este DNI.',
                ]);
            }

            $usuario = User::create([
                'dni' => $servidor->dni,
                'name' => $servidor->nombreCompleto(),
                'password' => Hash::make($password),
                'activo' => true,
                'servidor_id' => $servidor->id,
            ]);

            foreach ($propuesta['roles'] as $rol) {
                AsignacionRol::firstOrCreate([
                    'proceso_transferencia_id' => $servidor->proceso_transferencia_id,
                    'user_id' => $usuario->id,
                    'dependencia_id' => $rol['dependencia_id'],
                    'rol' => $rol['rol'],
                ]);
            }

            return $usuario;
        });
    }
}

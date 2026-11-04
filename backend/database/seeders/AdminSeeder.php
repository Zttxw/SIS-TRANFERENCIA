<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\User;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\Rol;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Crea el proceso de transferencia 2026 y un usuario administrador inicial para
 * poder operar el sistema (ingesta, activación de cuentas). Idempotente.
 *
 * Solo para entornos no productivos: el administrador real debe crearse con
 * credenciales propias. DNI y contraseña se toman de ADMIN_DNI / ADMIN_PASSWORD.
 */
class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $proceso = ProcesoTransferencia::firstOrCreate(
            ['anio' => 2026],
            [
                'nombre' => 'Transferencia de Gestión 2026',
                'fecha_corte' => '2026-12-31',
                'estado' => 'abierto',
                'descripcion' => 'Proceso de transferencia de gestión 2026 — MDSJ.',
            ],
        );

        $dni = (string) env('ADMIN_DNI', '00000000');
        $password = (string) env('ADMIN_PASSWORD', 'jemy1506');

        $admin = User::firstOrCreate(
            ['dni' => $dni],
            [
                'name' => 'Administrador del Sistema',
                'password' => Hash::make($password),
                'activo' => true,
            ],
        );

        AsignacionRol::firstOrCreate([
            'proceso_transferencia_id' => $proceso->id,
            'user_id' => $admin->id,
            'dependencia_id' => null,
            'rol' => Rol::ADMINISTRADOR->value,
        ]);
    }
}

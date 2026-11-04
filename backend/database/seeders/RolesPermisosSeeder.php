<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Support\Enums\Permiso;
use App\Support\Enums\Rol;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Siembra el catálogo de permisos y el mapeo rol→permiso (plan §5). Idempotente:
 * concilia por código y resincroniza el mapeo con Permiso::inicialesPorRol().
 *
 * Separado de los datos de prueba a propósito: define el modelo de autorización
 * del sistema, no datos de ejemplo.
 */
class RolesPermisosSeeder extends Seeder
{
    public function run(): void
    {
        $ahora = now();

        // Catálogo de permisos.
        $idPorCodigo = [];
        foreach (Permiso::cases() as $permiso) {
            $id = DB::table('permisos')->updateOrInsert(
                ['codigo' => $permiso->value],
                ['etiqueta' => $permiso->etiqueta(), 'updated_at' => $ahora, 'created_at' => $ahora],
            );
            $idPorCodigo[$permiso->value] = DB::table('permisos')->where('codigo', $permiso->value)->value('id');
        }

        // Mapeo rol→permiso, resincronizado por rol.
        foreach (Rol::cases() as $rol) {
            $deseados = array_map(
                fn (Permiso $p) => $idPorCodigo[$p->value],
                Permiso::inicialesPorRol($rol),
            );

            DB::table('rol_permiso')->where('rol', $rol->value)
                ->whereNotIn('permiso_id', $deseados)->delete();

            foreach ($deseados as $permisoId) {
                DB::table('rol_permiso')->updateOrInsert(
                    ['rol' => $rol->value, 'permiso_id' => $permisoId],
                    ['updated_at' => $ahora, 'created_at' => $ahora],
                );
            }
        }
    }
}

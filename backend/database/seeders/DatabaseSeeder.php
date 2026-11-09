<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     *
     * Siembra el catálogo de autorización (roles/permisos) y, en entornos no
     * productivos, el proceso 2026 y un administrador inicial.
     *
     * MapeoDependenciasSigaSeeder requiere que la ingesta del SGD ya haya
     * cargado las dependencias; es idempotente y no falla si aún no existen.
     */
    public function run(): void
    {
        $this->call(RolesPermisosSeeder::class);
        $this->call(AdminSeeder::class);
        $this->call(MapeoDependenciasSigaSeeder::class);
    }
}

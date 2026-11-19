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
     * El catálogo del Anexo 01 no depende de ninguna ingesta. La tabla de
     * equivalencias vincula las dependencias del SGD ya cargadas (las que aún
     * no existan se registran al ingerirlas). Los feriados alimentan el cálculo
     * en días hábiles del cronograma. Todos son idempotentes.
     */
    public function run(): void
    {
        $this->call(RolesPermisosSeeder::class);
        $this->call(AdminSeeder::class);
        $this->call(CentrosCostoAnexo01Seeder::class);
        $this->call(EquivalenciasCentroCostoSeeder::class);
        $this->call(FeriadosSeeder::class);
    }
}

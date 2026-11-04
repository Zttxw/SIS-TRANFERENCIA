<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Catálogo de permisos y su mapeo con los roles del sistema (plan §5). Los
     * roles se modelan como enum (App\Support\Enums\Rol) y se asignan por ámbito
     * en `asignaciones_rol`; aquí se materializa qué permisos otorga cada rol,
     * para que el mapeo sea consultable y editable desde la base de datos.
     */
    public function up(): void
    {
        Schema::create('permisos', function (Blueprint $table) {
            $table->id();
            $table->string('codigo')->unique()->comment('Enum App\\Support\\Enums\\Permiso');
            $table->string('etiqueta');
            $table->string('descripcion')->nullable();
            $table->timestamps();
        });

        Schema::create('rol_permiso', function (Blueprint $table) {
            $table->id();
            $table->string('rol')->comment('Enum App\\Support\\Enums\\Rol');
            $table->foreignId('permiso_id')->constrained('permisos')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['rol', 'permiso_id']);
            $table->index('rol');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rol_permiso');
        Schema::dropIfExists('permisos');
    }
};

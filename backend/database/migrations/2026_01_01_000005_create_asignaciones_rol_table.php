<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Asignación de rol a un usuario, acotada por dependencia/ámbito (plan §5).
     * Un usuario puede tener varios roles en distintas dependencias.
     */
    public function up(): void
    {
        Schema::create('asignaciones_rol', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proceso_transferencia_id')->constrained('procesos_transferencia')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('dependencia_id')->nullable()->constrained('dependencias')->nullOnDelete()
                ->comment('Ámbito del rol; nulo para roles institucionales (Administrador, ETTS, ETTE)');
            $table->string('rol')->comment('Enum App\\Support\\Enums\\Rol');
            $table->timestamps();

            $table->unique(['proceso_transferencia_id', 'user_id', 'dependencia_id', 'rol'], 'asignaciones_rol_unica');
            $table->index(['user_id', 'rol']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('asignaciones_rol');
    }
};

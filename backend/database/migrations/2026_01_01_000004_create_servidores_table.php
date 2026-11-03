<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Servidores públicos (personas del inventario organizacional). Distinto de
     * `users` (cuentas de acceso): no todo servidor inicia sesión. Vinculado
     * opcionalmente a un User mediante user_id (plan §4.1, §7.5).
     */
    public function up(): void
    {
        Schema::create('servidores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proceso_transferencia_id')->constrained('procesos_transferencia')->cascadeOnDelete();
            $table->foreignId('dependencia_id')->nullable()->constrained('dependencias')->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete()
                ->comment('Cuenta de acceso vinculada, si el servidor usa el sistema');

            $table->string('dni', 15)->comment('Documento de identidad');
            $table->string('nombres');
            $table->string('apellidos')->nullable();
            $table->string('cargo')->nullable();

            // Datos complementados por RR.HH. cuando no provienen del SGD (plan §7.5).
            $table->string('regimen_laboral')->nullable();
            $table->string('modalidad_contractual')->nullable();
            $table->string('situacion_laboral')->nullable();

            $table->boolean('es_responsable')->default(false)
                ->comment('Responsable de la dependencia a la que pertenece');

            $table->string('fuente')->default('sgd');
            $table->string('fuente_referencia')->nullable();
            $table->timestamp('extraido_en')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->unique(['proceso_transferencia_id', 'dni']);
            $table->index('dependencia_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('servidores');
    }
};

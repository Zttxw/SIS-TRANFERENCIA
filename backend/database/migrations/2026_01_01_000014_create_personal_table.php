<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Relación de personal por dependencia (Anexo 05, plan §7.5). Datos base
     * del SGD, complementados por RR.HH. (régimen, modalidad, situación).
     * Es la vista del anexo; la entidad maestra persona es `servidores`.
     */
    public function up(): void
    {
        Schema::create('personal', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proceso_transferencia_id')->constrained('procesos_transferencia')->cascadeOnDelete();
            $table->foreignId('dependencia_id')->constrained('dependencias')->cascadeOnDelete();
            $table->foreignId('servidor_id')->nullable()->constrained('servidores')->nullOnDelete();

            $table->string('dni', 15);
            $table->string('nombres');
            $table->string('apellidos')->nullable();
            $table->string('cargo')->nullable();
            $table->string('regimen_laboral')->nullable();
            $table->string('modalidad_contractual')->nullable();
            $table->string('situacion_laboral')->nullable();

            $table->boolean('validado')->default(false)->comment('Validado por el responsable competente');
            $table->foreignId('validado_por_id')->nullable()->constrained('users')->nullOnDelete();

            $table->string('fuente')->default('sgd');
            $table->string('fuente_referencia')->nullable();
            $table->timestamp('extraido_en')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index('dependencia_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('personal');
    }
};

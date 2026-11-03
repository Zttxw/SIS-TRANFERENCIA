<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Proceso de transferencia de gestión (plan §7.1, RN-12). Contenedor raíz
     * del periodo y fecha de corte al que se asocian todos los registros.
     */
    public function up(): void
    {
        Schema::create('procesos_transferencia', function (Blueprint $table) {
            $table->id();
            $table->string('nombre')->comment('p.ej. "Transferencia de Gestión 2026"');
            $table->unsignedSmallInteger('anio');
            $table->date('fecha_corte')->comment('Fecha a la que corresponde la información (RN-12)');
            $table->string('estado')->default('abierto')->comment('abierto, en_consolidacion, cerrado');
            $table->text('descripcion')->nullable();
            $table->timestamp('cerrado_en')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('anio');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('procesos_transferencia');
    }
};

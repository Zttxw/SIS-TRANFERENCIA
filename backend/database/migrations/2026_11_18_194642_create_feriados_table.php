<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Calendario de días no laborables para el cálculo en días hábiles del
     * cronograma (RF-22, D-12). Es común a todos los procesos: un feriado es un
     * hecho del calendario, no del proceso.
     */
    public function up(): void
    {
        Schema::create('feriados', function (Blueprint $table) {
            $table->id();
            $table->date('fecha')->unique();
            $table->string('descripcion', 200);
            $table->string('alcance', 20)->default('nacional')->comment('nacional o local (AlcanceFeriado)');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('feriados');
    }
};

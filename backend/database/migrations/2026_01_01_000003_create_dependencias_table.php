<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Dependencias / centros de costo (plan §4.1, §7.1). Estructura jerárquica
     * autorreferenciada importada desde el SGD. La fuente se conserva (RN-01, RN-03).
     */
    public function up(): void
    {
        Schema::create('dependencias', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proceso_transferencia_id')->constrained('procesos_transferencia')->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('dependencias')->nullOnDelete()
                ->comment('Dependencia superior en la jerarquía institucional');
            $table->string('codigo')->comment('Código del centro de costo / dependencia');
            $table->string('codigo_sgd')->nullable()->comment('Identificador original en el SGD');
            $table->string('nombre');
            $table->string('tipo')->nullable()->comment('gerencia, subgerencia, oficina, unidad, etc.');
            $table->unsignedTinyInteger('nivel')->default(1)->comment('Nivel jerárquico (1 = superior)');
            $table->boolean('activa')->default(true);

            // Trazabilidad de origen (RN-03).
            $table->string('fuente')->default('sgd');
            $table->string('fuente_referencia')->nullable();
            $table->timestamp('extraido_en')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->unique(['proceso_transferencia_id', 'codigo']);
            $table->index('parent_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dependencias');
    }
};

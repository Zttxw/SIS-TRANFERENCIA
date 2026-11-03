<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('movimientos_auditoria', function (Blueprint $table) {
            $table->id();
            $table->morphs('auditable');
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('evento')->comment('creado, actualizado, eliminado, remitido, observado, etc.');
            $table->jsonb('valores_anteriores')->nullable();
            $table->jsonb('valores_nuevos')->nullable();
            $table->string('ip', 45)->nullable();
            $table->timestamps();

            $table->index(['evento', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('movimientos_auditoria');
    }
};

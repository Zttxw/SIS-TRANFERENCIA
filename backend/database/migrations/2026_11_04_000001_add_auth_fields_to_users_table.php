<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Credenciales de acceso por DNI (no por email). El servidor (persona del
     * padrón SGD) es la fuente de datos; el User es la cuenta de acceso y se
     * vincula opcionalmente a un servidor (plan §5).
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('dni', 15)->nullable()->unique()->after('id')
                ->comment('Documento de identidad; credencial de inicio de sesión');
            $table->boolean('activo')->default(false)->after('password')
                ->comment('Solo las cuentas activas pueden iniciar sesión');
            $table->foreignId('servidor_id')->nullable()->after('activo')
                ->constrained('servidores')->nullOnDelete()
                ->comment('Servidor del padrón SGD vinculado a esta cuenta');

            // El email deja de ser obligatorio: muchos servidores no tienen uno.
            $table->string('email')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('servidor_id');
            $table->dropColumn(['dni', 'activo']);
            $table->string('email')->nullable(false)->change();
        });
    }
};

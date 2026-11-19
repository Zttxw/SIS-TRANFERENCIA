<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Directiva 2026 (fase 6): el Anexo 01 (relación de CC) se firma una sola vez,
 * al cierre del proceso, por el ETTS y un titular ETTE. Es un documento
 * institucional, no de un CC: en las tablas de firma se guarda con
 * `dependencia_id` NULL. Las versiones del documento institucional se
 * serializan bloqueando el proceso, porque la unicidad con NULL no aplica.
 */
return new class extends Migration
{
    private const TABLAS = ['firma_borradores', 'documentos_firma', 'firma_sesiones', 'firmas_anexo'];

    public function up(): void
    {
        foreach (self::TABLAS as $tabla) {
            Schema::table($tabla, function (Blueprint $table) {
                $table->unsignedBigInteger('dependencia_id')->nullable()->change();
            });
        }
    }

    public function down(): void
    {
        foreach (self::TABLAS as $tabla) {
            Schema::table($tabla, function (Blueprint $table) {
                $table->unsignedBigInteger('dependencia_id')->nullable(false)->change();
            });
        }
    }
};

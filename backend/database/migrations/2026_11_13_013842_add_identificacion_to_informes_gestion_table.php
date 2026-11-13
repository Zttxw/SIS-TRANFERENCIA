<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('informes_gestion', function (Blueprint $table) {
            $table->string('responsable_nombre')->nullable();
            $table->string('cargo_responsable')->nullable();
            $table->string('periodo_gestion', 100)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('informes_gestion', function (Blueprint $table) {
            $table->dropColumn(['responsable_nombre', 'cargo_responsable', 'periodo_gestion']);
        });
    }
};

<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Rediseño del Anexo 03: dos secciones (A digital del SGD, B física registrada
 * a mano) agrupadas por año, con solo cuatro columnas: serie documental,
 * folios, tipo de unidad de conservación y ubicación.
 *
 * Antes de borrar las columnas antiguas, las filas manuales reciben un solo
 * año (el `anio`, o el inicio del rango, o el primer año del `periodo`) y pasan
 * a la sección B. Las filas del SGD se regeneran con `sgd:ingestar --documental`.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('acervo_documental')
            ->where('fuente', '!=', 'sgd')
            ->orderBy('id')
            ->each(function (object $fila): void {
                preg_match('/\b(?:19|20)\d{2}\b/', (string) $fila->periodo, $coincidencia);

                DB::table('acervo_documental')->where('id', $fila->id)->update([
                    'tipo' => 'fisico',
                    'anio' => $fila->anio ?? $fila->desde_anio ?? (isset($coincidencia[0]) ? (int) $coincidencia[0] : null),
                ]);
            });

        Schema::table('acervo_documental', function (Blueprint $table) {
            $table->renameColumn('total_folios', 'folios');
        });

        Schema::table('acervo_documental', function (Blueprint $table) {
            $table->dropColumn([
                'identificacion_archivador',
                'desde_anio',
                'hasta_anio',
                'periodo',
                'cantidad_unidades',
                'descripcion',
                'observaciones',
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('acervo_documental', function (Blueprint $table) {
            $table->renameColumn('folios', 'total_folios');
        });

        Schema::table('acervo_documental', function (Blueprint $table) {
            $table->string('identificacion_archivador')->nullable();
            $table->unsignedSmallInteger('desde_anio')->nullable();
            $table->unsignedSmallInteger('hasta_anio')->nullable();
            $table->string('periodo')->nullable();
            $table->unsignedInteger('cantidad_unidades')->nullable();
            $table->text('descripcion')->nullable();
            $table->text('observaciones')->nullable();
        });
    }
};

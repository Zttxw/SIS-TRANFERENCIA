<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Fase 0 — Alinea el Anexo 02 (informes_gestion) al formato oficial de la
 * directiva: cada sección deja de ser un `text` plano y pasa a ser una tabla
 * de filas repetibles almacenada en `jsonb` (mismo patrón que actas_transferencia).
 *
 * Secciones (Anexo 02 de la propuesta-directiva):
 *   I.   Identificación + funciones  -> cabecera + jsonb `funciones`
 *   II.  Logros y resultados          -> jsonb `logros` (5 columnas)
 *   III. Dificultades afrontadas      -> jsonb `dificultades` (3 columnas)
 *   IV.  Agenda pendiente             -> jsonb `asuntos_pendientes` (5 columnas)
 *
 * El texto libre ya capturado se conserva migrándolo como la primera fila de
 * cada sección (fila "heredada"), para no perder información.
 */
return new class extends Migration
{
    public function up(): void
    {
        // 1) Columnas de cabecera oficiales (sección I) + nuevas columnas jsonb.
        Schema::table('informes_gestion', function (Blueprint $table) {
            $table->string('nivel_organizacional')->nullable()->after('servidor_responsable_id')
                ->comment('primer|segundo|tercer nivel|equipo_trabajo (Anexo 02 §I)');
            $table->string('cargo_periodo')->nullable()->after('nivel_organizacional')
                ->comment('Cargo/puesto y periodo de gestión del responsable (Anexo 02 §I)');

            $table->jsonb('funciones')->nullable()->after('cargo_periodo')
                ->comment('Sección I: filas {n, descripcion}');
            $table->jsonb('logros_items')->nullable()->after('funciones')
                ->comment('Sección II: filas {n, actividad, resultado, indicador, verificacion}');
            $table->jsonb('dificultades_items')->nullable()->after('logros_items')
                ->comment('Sección III: filas {n, dificultad, efecto, medida}');
            $table->jsonb('pendientes_items')->nullable()->after('dificultades_items')
                ->comment('Sección IV: filas {n, asunto, estado_accion, documento_referencia, plazo, responsable}');
        });

        // 2) Migrar el texto heredado a la primera fila de cada sección.
        $this->migrarTextoHeredado();

        // 3) Eliminar las columnas de texto plano ya migradas.
        Schema::table('informes_gestion', function (Blueprint $table) {
            $table->dropColumn(['principales_funciones', 'logros', 'dificultades', 'asuntos_pendientes']);
        });
    }

    public function down(): void
    {
        Schema::table('informes_gestion', function (Blueprint $table) {
            $table->text('principales_funciones')->nullable();
            $table->text('logros')->nullable();
            $table->text('dificultades')->nullable();
            $table->text('asuntos_pendientes')->nullable();
        });

        // Revertir: concatenar las filas de vuelta a texto plano (best-effort).
        foreach (DB::table('informes_gestion')->get() as $row) {
            DB::table('informes_gestion')->where('id', $row->id)->update([
                'principales_funciones' => $this->filasAFuncionesTexto($row->funciones),
                'logros' => $this->filasAColumnasTexto($row->logros_items, ['actividad', 'resultado', 'indicador', 'verificacion']),
                'dificultades' => $this->filasAColumnasTexto($row->dificultades_items, ['dificultad', 'efecto', 'medida']),
                'asuntos_pendientes' => $this->filasAColumnasTexto($row->pendientes_items, ['asunto', 'estado_accion', 'documento_referencia', 'plazo', 'responsable']),
            ]);
        }

        Schema::table('informes_gestion', function (Blueprint $table) {
            $table->dropColumn([
                'nivel_organizacional', 'cargo_periodo',
                'funciones', 'logros_items', 'dificultades_items', 'pendientes_items',
            ]);
        });
    }

    private function migrarTextoHeredado(): void
    {
        foreach (DB::table('informes_gestion')->get() as $row) {
            $funciones = $this->textoAFilaUnica($row->principales_funciones, 'descripcion');
            $logros = $this->textoAFilaUnica($row->logros, 'actividad');
            $dificultades = $this->textoAFilaUnica($row->dificultades, 'dificultad');
            $pendientes = $this->textoAFilaUnica($row->asuntos_pendientes, 'asunto');

            DB::table('informes_gestion')->where('id', $row->id)->update([
                'funciones' => $funciones ? json_encode($funciones) : null,
                'logros_items' => $logros ? json_encode($logros) : null,
                'dificultades_items' => $dificultades ? json_encode($dificultades) : null,
                'pendientes_items' => $pendientes ? json_encode($pendientes) : null,
            ]);
        }
    }

    /** Convierte un texto libre en una sola fila con `n=1` y el campo dado. */
    private function textoAFilaUnica(?string $texto, string $campo): ?array
    {
        $texto = trim((string) $texto);
        if ($texto === '') {
            return null;
        }

        return [['n' => 1, $campo => $texto]];
    }

    private function filasAFuncionesTexto($json): ?string
    {
        $filas = $this->decodeFilas($json);
        if ($filas === []) {
            return null;
        }

        return implode("\n", array_map(
            static fn ($f) => trim((string) ($f['descripcion'] ?? '')),
            $filas
        ));
    }

    private function filasAColumnasTexto($json, array $campos): ?string
    {
        $filas = $this->decodeFilas($json);
        if ($filas === []) {
            return null;
        }

        return implode("\n", array_map(
            static function ($f) use ($campos) {
                $partes = array_map(static fn ($c) => trim((string) ($f[$c] ?? '')), $campos);

                return implode(' | ', array_filter($partes, static fn ($p) => $p !== ''));
            },
            $filas
        ));
    }

    private function decodeFilas($json): array
    {
        if (is_array($json)) {
            return $json;
        }
        $decoded = json_decode((string) $json, true);

        return is_array($decoded) ? $decoded : [];
    }
};

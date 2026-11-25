<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * El Anexo 03 se divide en dos documentos: 03-A (acervo físico) y 03-B
 * (acervo digital del SGD), cada uno con su PDF, sus firmas y su ítem en el
 * Acta 07.
 *
 * - Las firmas y PDF generados del antiguo `anexo03` se descartan: hay que
 *   generar y firmar el 03-A y el 03-B.
 * - En el Acta 07, la condición del ítem `anexo_03` pasa a `anexo_03a` y
 *   `anexo_03b`.
 * - Las observaciones del anexo `acervo` pasan a `acervo_fisico` o
 *   `acervo_digital` según la fila observada (las del anexo completo, al
 *   físico).
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::transaction(function (): void {
            $this->descartarFirmasAnexo03();
            $this->transformarActas(function (array $condiciones): array {
                if (array_key_exists('anexo_03', $condiciones)) {
                    $condiciones['anexo_03a'] = $condiciones['anexo_03'];
                    $condiciones['anexo_03b'] = $condiciones['anexo_03'];
                    unset($condiciones['anexo_03']);
                }

                return $condiciones;
            });

            DB::table('observaciones')->where('anexo', 'acervo')->orderBy('id')->each(function (object $observacion): void {
                $tipo = $observacion->observable_id === null
                    ? null
                    : DB::table('acervo_documental')->where('id', $observacion->observable_id)->value('tipo');

                DB::table('observaciones')->where('id', $observacion->id)
                    ->update(['anexo' => $tipo === 'digital' ? 'acervo_digital' : 'acervo_fisico']);
            });
        });
    }

    /**
     * Las firmas del 03-A y 03-B no se pueden convertir de vuelta en un único
     * Anexo 03: solo se revierten las claves del acta y de las observaciones.
     */
    public function down(): void
    {
        DB::transaction(function (): void {
            $this->transformarActas(function (array $condiciones): array {
                if (array_key_exists('anexo_03a', $condiciones) || array_key_exists('anexo_03b', $condiciones)) {
                    $condiciones['anexo_03'] = $condiciones['anexo_03a'] ?? $condiciones['anexo_03b'];
                    unset($condiciones['anexo_03a'], $condiciones['anexo_03b']);
                }

                return $condiciones;
            });

            DB::table('observaciones')->whereIn('anexo', ['acervo_fisico', 'acervo_digital'])->update(['anexo' => 'acervo']);
        });
    }

    private function descartarFirmasAnexo03(): void
    {
        $sesiones = DB::table('firma_sesiones')->where('tipo_documento', 'anexo03')->pluck('id');

        DB::table('firmas_anexo')->whereIn('firma_sesion_id', $sesiones)->delete();
        DB::table('firma_sesiones')->whereIn('id', $sesiones)->update(['documento_previo_id' => null]);
        DB::table('firma_sesiones')->whereIn('id', $sesiones)->delete();
        DB::table('documentos_firma')->where('tipo_documento', 'anexo03')->delete();
        DB::table('firma_borradores')->where('tipo_documento', 'anexo03')->delete();
    }

    /** @param  callable(array<string, mixed>): array<string, mixed>  $transformar */
    private function transformarActas(callable $transformar): void
    {
        DB::table('actas_transferencia')->whereNotNull('anexos_entregados')->orderBy('id')
            ->each(function (object $acta) use ($transformar): void {
                $condiciones = json_decode((string) $acta->anexos_entregados, true);
                if (! is_array($condiciones)) {
                    return;
                }

                DB::table('actas_transferencia')->where('id', $acta->id)
                    ->update(['anexos_entregados' => json_encode($transformar($condiciones), JSON_UNESCAPED_UNICODE)]);
            });
    }
};

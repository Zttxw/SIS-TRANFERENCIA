<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Documentos\Models\DocumentoPendiente;
use App\Modules\Gestion\Models\InformeGestion;
use App\Modules\Gestion\Services\InformeGestionPdf;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Organization\Models\EstadoSgd;
use App\Modules\Transferencia\Models\Entrega;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Modules\Transferencia\Services\FirmaperuPdfService;
use App\Modules\Transferencia\Services\TransferenciaService;
use App\Support\Enums\EstadoEntrega;
use App\Support\Enums\FuenteDato;
use App\Support\Enums\Rol;
use Database\Seeders\RolesPermisosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * PDF oficial del Anexo 02 (F5). Vertical de referencia: se emite en cualquier
 * estado (borrador incluido), acotado al ámbito y con el formato de la directiva.
 * Su sección IV combina la entrada libre con los documentos pendientes del CC,
 * que se congelan al presentar la entrega (D-09).
 */
class InformeGestionPdfTest extends TestCase
{
    use RefreshDatabase;

    private ProcesoTransferencia $proceso;

    private Dependencia $dep;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesPermisosSeeder::class);
        $this->proceso = ProcesoTransferencia::factory()->create();
        $this->dep = Dependencia::factory()->create([
            'proceso_transferencia_id' => $this->proceso->id,
            'nivel' => 2,
        ]);
    }

    private function servidorEn(Dependencia $dep): User
    {
        $usuario = User::factory()->create();
        AsignacionRol::factory()->rol(Rol::SERVIDOR)->create([
            'user_id' => $usuario->id,
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $dep->id,
        ]);
        Sanctum::actingAs($usuario);

        return $usuario;
    }

    public function test_descarga_pdf_del_anexo_02_aun_sin_informe(): void
    {
        $this->servidorEn($this->dep);

        $respuesta = $this->get("/api/gestion/informe/pdf?dependencia_id={$this->dep->id}");

        $respuesta->assertOk();
        $respuesta->assertHeader('content-type', 'application/pdf');
        $this->assertStringStartsWith('%PDF', $respuesta->streamedContent());
    }

    public function test_pdf_de_informe_remitido_no_lleva_sufijo_borrador(): void
    {
        $this->servidorEn($this->dep);

        InformeGestion::create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->dep->id,
            'nivel_organizacional' => 'segundo_nivel',
            'cargo_periodo' => 'Jefe de Oficina · 2023-2026',
            'funciones' => [['n' => 1, 'descripcion' => 'Coordinar las actividades de la oficina.']],
            'estado' => 'completado',
        ]);

        Entrega::create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->dep->id,
            'dependencia_destino_id' => $this->dep->parent_id,
            'estado' => EstadoEntrega::REMITIDA,
        ]);

        $respuesta = $this->get("/api/gestion/informe/pdf?dependencia_id={$this->dep->id}");

        $respuesta->assertOk();
        $disposition = $respuesta->headers->get('content-disposition');
        $this->assertStringContainsString('Anexo02-InformeGestion', (string) $disposition);
        $this->assertStringNotContainsString('BORRADOR', (string) $disposition);
    }

    public function test_pdf_fuera_de_ambito_devuelve_403(): void
    {
        $this->servidorEn($this->dep);

        $otra = Dependencia::factory()->create([
            'proceso_transferencia_id' => $this->proceso->id,
            'nivel' => 2,
        ]);

        $this->get("/api/gestion/informe/pdf?dependencia_id={$otra->id}")
            ->assertStatus(403);
    }

    public function test_pdf_requiere_dependencia_id(): void
    {
        $this->servidorEn($this->dep);

        $this->get('/api/gestion/informe/pdf')
            ->assertStatus(422);
    }

    private function pendiente(string $asunto, FuenteDato $fuente, array $datos = []): DocumentoPendiente
    {
        return DocumentoPendiente::create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->dep->id,
            'asunto' => $asunto,
            'fuente' => $fuente->value,
            'extraido_en' => now(),
            ...$datos,
        ]);
    }

    /** @return list<array<string, mixed>> */
    private function seccionIv(): array
    {
        return app(InformeGestionPdf::class)->datos($this->dep->id)['informe']['pendientes_items'];
    }

    public function test_la_seccion_iv_combina_la_entrada_libre_con_los_pendientes_del_sgd_y_manuales(): void
    {
        config(['modulos.documentos_pendientes' => true]);
        $this->servidorEn($this->dep);
        EstadoSgd::create(['dominio' => EstadoSgd::DOMINIO_RECEPCION, 'codigo' => '1', 'descripcion' => 'RECIBIDO']);
        InformeGestion::create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->dep->id,
            'funciones' => [['n' => 1, 'descripcion' => 'Coordinar las actividades de la oficina.']],
            'pendientes_items' => [['n' => 1, 'asunto' => 'Convenio por renovar', 'plazo' => 'Marzo 2027']],
        ]);
        $this->pendiente('Solicitud de acceso a la información', FuenteDato::SGD, [
            'tipo_documento' => 'OFICIO', 'numero_documento' => '045-2026', 'estado_atencion' => '1',
            'fecha_documento' => '2026-10-05',
        ]);
        $this->pendiente('Queja vecinal registrada en ventanilla', FuenteDato::MANUAL, [
            'estado_atencion' => 'PENDIENTE', 'justificacion_pendiente' => 'Falta inspección de campo.',
        ]);

        $filas = $this->seccionIv();

        $this->assertSame([1, 2, 3], array_column($filas, 'n'));
        $this->assertSame(['manual', 'sgd', 'manual'], array_column($filas, 'origen'));
        $this->assertSame('Convenio por renovar', $filas[0]['asunto']);
        $this->assertSame([
            'asunto' => 'Solicitud de acceso a la información',
            'estado_accion' => 'RECIBIDO',
            'documento_referencia' => 'OFICIO 045-2026',
            'plazo' => 'Doc. del 05/10/2026',
            'responsable' => $this->dep->nombre,
            'origen' => 'sgd',
            'n' => 2,
        ], $filas[1]);
        $this->assertSame('PENDIENTE. Justificación: Falta inspección de campo', $filas[2]['estado_accion']);

        $html = view('pdf.partials.anexo02', app(InformeGestionPdf::class)->datos($this->dep->id))->render();
        $this->assertStringContainsString('Solicitud de acceso a la información', $html);
        $this->assertStringContainsString('<td>SGD</td>', $html);

        $this->getJson("/api/gestion/informe?dependencia_id={$this->dep->id}")->assertOk()
            ->assertJsonCount(2, 'data.agenda_documental')
            ->assertJsonPath('data.agenda_documental.0.origen', 'sgd')
            ->assertJsonMissingPath('data.pendientes_documentales');
    }

    public function test_los_pendientes_se_leen_en_vivo_hasta_presentar_y_luego_quedan_congelados(): void
    {
        config(['modulos.documentos_pendientes' => true]);
        $responsable = User::factory()->create();
        AsignacionRol::factory()->rol(Rol::RESPONSABLE_CENTRO_COSTO)->create([
            'user_id' => $responsable->id,
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->dep->id,
        ]);
        $pdf = app(FirmaperuPdfService::class);
        $documento = $this->pendiente('Asunto inicial del SGD', FuenteDato::SGD);
        $huellaInicial = $pdf->huella('anexo02', $this->dep->id, $responsable);

        // Antes de presentar: una reingesta del SGD cambia el PDF y su huella.
        $documento->update(['asunto' => 'Asunto actualizado por la reingesta']);
        $huellaPresentada = $pdf->huella('anexo02', $this->dep->id, $responsable);
        $this->assertNotSame($huellaInicial, $huellaPresentada);

        Sanctum::actingAs($responsable);
        $this->postJson('/api/transferencia/presentar', ['dependencia_id' => $this->dep->id])->assertOk();

        // Después de presentar: el SGD cambia, pero el Anexo 02 queda fijo.
        $documento->update(['asunto' => 'Cambio posterior a la presentación']);
        $this->pendiente('Documento nuevo tras presentar', FuenteDato::SGD);

        $this->assertSame($huellaPresentada, $pdf->huella('anexo02', $this->dep->id, $responsable));
        $this->assertSame(['Asunto actualizado por la reingesta'], array_column($this->seccionIv(), 'asunto'));
        // La fila creada para congelar no cuenta como informe entregado.
        $this->assertFalse(app(TransferenciaService::class)->presenciaAnexos($this->dep->id, $this->proceso->id)['anexo_02']);
    }
}

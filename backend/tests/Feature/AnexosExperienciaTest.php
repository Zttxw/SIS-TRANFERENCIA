<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Documentos\Models\DocumentoPendiente;
use App\Modules\Gestion\Services\InformeGestionPdf;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Organization\Models\Servidor;
use App\Modules\Patrimonio\Models\BienPatrimonial;
use App\Modules\Personal\Models\Personal;
use App\Modules\Personal\Services\IngestaPersonalSgd;
use App\Modules\Personal\Services\PersonalPdf;
use App\Modules\Transferencia\Models\Entrega;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\Rol;
use Database\Seeders\RolesPermisosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AnexosExperienciaTest extends TestCase
{
    use RefreshDatabase;

    private ProcesoTransferencia $proceso;

    private Dependencia $dep;

    public function test_verificar_patrimonio_guarda_y_devuelve_el_bien_actualizado(): void
    {
        $bien = BienPatrimonial::create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->dep->id,
            'codigo_patrimonial' => 'PAT-001',
            'denominacion' => 'Escritorio',
        ]);

        $this->postJson('/api/patrimonio/bienes/'.$bien->id.'/verificar', [
            'estado' => 'confirmado',
            'estado_conservacion' => 'bueno',
            'ubicacion' => 'Oficina de administración',
        ])->assertOk()
            ->assertJsonPath('data.id', $bien->id)
            ->assertJsonPath('data.ubicacion', 'Oficina de administración')
            ->assertJsonPath('data.verificacion.estado', 'confirmado')
            ->assertJsonPath('data.verificacion.verificado_por.id', auth()->id())
            ->assertJsonPath('data.dependencia.id', $this->dep->id);

        $this->assertDatabaseHas('verificaciones_bien', [
            'bien_patrimonial_id' => $bien->id,
            'estado' => 'confirmado',
        ]);
    }

    public function test_ultima_verificacion_identifica_al_usuario_que_realizo_el_cotejo(): void
    {
        $bien = BienPatrimonial::create([
            'proceso_transferencia_id' => $this->proceso->id, 'dependencia_id' => $this->dep->id,
            'codigo_patrimonial' => 'VER-001', 'denominacion' => 'Monitor',
        ]);
        $this->postJson('/api/patrimonio/bienes/'.$bien->id.'/verificar', ['estado' => 'confirmado'])->assertOk();
        $revisor = User::factory()->create(['name' => 'Servidor que coteja']);
        AsignacionRol::factory()->rol(Rol::SERVIDOR)->create([
            'user_id' => $revisor->id, 'dependencia_id' => $this->dep->id,
            'proceso_transferencia_id' => $this->proceso->id,
        ]);
        Sanctum::actingAs($revisor);

        $this->postJson('/api/patrimonio/bienes/'.$bien->id.'/verificar', ['estado' => 'confirmado'])
            ->assertOk()->assertJsonPath('data.verificacion.verificado_por.name', 'Servidor que coteja');

        $this->assertDatabaseHas('verificaciones_bien', ['bien_patrimonial_id' => $bien->id, 'verificado_por_id' => $revisor->id]);
        $this->getJson('/api/patrimonio/bienes?dependencia_id='.$this->dep->id)->assertOk()
            ->assertJsonPath('data.0.verificacion.verificado_por.id', $revisor->id);
    }

    public function test_acervo_muestra_al_registrador_original_tras_edicion_de_otro_usuario(): void
    {
        $autor = auth()->user();
        $datos = [
            'dependencia_id' => $this->dep->id, 'tipo' => 'fisico',
            'serie_documental' => 'Informes', 'cantidad_unidades' => 2,
            'unidad_conservacion' => 'Archivadores',
        ];
        $id = $this->postJson('/api/acervo', $datos)->assertCreated()->json('data.id');
        $editor = User::factory()->create();
        AsignacionRol::factory()->rol(Rol::SERVIDOR)->create([
            'user_id' => $editor->id, 'dependencia_id' => $this->dep->id,
            'proceso_transferencia_id' => $this->proceso->id,
        ]);
        Sanctum::actingAs($editor);

        $this->putJson('/api/acervo/'.$id, [...$datos, 'cantidad_unidades' => 3])->assertOk();

        $this->getJson('/api/acervo?dependencia_id='.$this->dep->id)->assertOk()
            ->assertJsonPath('data.0.registrado_por.id', $autor->id);
        $this->assertDatabaseHas('acervo_documental', ['id' => $id, 'registrado_por_id' => $autor->id, 'cantidad_unidades' => 3]);
    }

    public function test_bienes_no_patrimoniales_muestran_quien_los_registro(): void
    {
        $autor = auth()->user();
        $this->postJson('/api/nopatrimonial', [
            'dependencia_id' => $this->dep->id, 'denominacion' => 'Herramientas de soporte',
            'cantidad' => 1, 'unidad_medida' => 'Kit',
        ])->assertCreated();

        $this->getJson('/api/nopatrimonial?dependencia_id='.$this->dep->id)->assertOk()
            ->assertJsonPath('data.0.registrado_por.id', $autor->id);
        $this->assertDatabaseHas('bienes_no_patrimoniales', ['denominacion' => 'Herramientas de soporte', 'registrado_por_id' => $autor->id]);
    }

    public function test_informe_muestra_al_usuario_del_ultimo_guardado(): void
    {
        $autor = auth()->user();
        $this->postJson('/api/gestion/informe', [
            'dependencia_id' => $this->dep->id,
            'funciones' => [['descripcion' => 'Coordinar los servicios']],
            'logros_items' => [['actividad' => 'Mejorar los servicios']],
        ])->assertOk();

        $this->getJson('/api/gestion/informe?dependencia_id='.$this->dep->id)->assertOk()
            ->assertJsonPath('data.elaborado_por.id', $autor->id);
        $this->assertDatabaseHas('informes_gestion', ['dependencia_id' => $this->dep->id, 'elaborado_por_id' => $autor->id]);
    }

    public function test_personal_muestra_usuario_del_ultimo_guardado(): void
    {
        $autor = auth()->user();
        $this->postJson('/api/personal', [
            'dependencia_id' => $this->dep->id, 'dni' => '12345678',
            'nombres' => 'Persona', 'apellidos' => 'Registrada',
            'cargo' => 'Soporte', 'regimen_laboral' => 'CAS',
        ])->assertCreated();

        $this->getJson('/api/personal?dependencia_id='.$this->dep->id)->assertOk()
            ->assertJsonPath('data.0.validado_por.id', $autor->id)
            ->assertJsonPath('data.0.validado_por.name', $autor->name);
        $this->assertDatabaseHas('personal', ['dni' => '12345678', 'validado_por_id' => $autor->id]);
    }

    public function test_documentos_identifica_al_creador_desde_auditoria_sin_exponer_valores_ni_ip(): void
    {
        $autor = auth()->user();
        $doc = DocumentoPendiente::create([
            'proceso_transferencia_id' => $this->proceso->id, 'dependencia_id' => $this->dep->id,
            'asunto' => 'Solicitud registrada', 'fuente' => 'manual',
        ]);

        $respuesta = $this->getJson('/api/documentos-pendientes?dependencia_id='.$this->dep->id)
            ->assertOk()->assertJsonPath('data.0.registro_auditoria.usuario.id', $autor->id);

        $this->assertArrayNotHasKey('ip', $respuesta->json('data.0.registro_auditoria'));
        $this->assertArrayNotHasKey('valores_nuevos', $respuesta->json('data.0.registro_auditoria'));
        $this->assertDatabaseHas('movimientos_auditoria', ['auditable_id' => $doc->id, 'auditable_type' => $doc->getMorphClass(), 'user_id' => $autor->id, 'evento' => 'creado']);
    }

    public function test_verificar_patrimonio_de_otra_dependencia_devuelve_403(): void
    {
        $ajena = Dependencia::factory()->create(['proceso_transferencia_id' => $this->proceso->id]);
        $bien = BienPatrimonial::create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $ajena->id,
            'codigo_patrimonial' => 'PAT-002',
            'denominacion' => 'Escritorio ajeno',
        ]);

        $this->postJson('/api/patrimonio/bienes/'.$bien->id.'/verificar', [
            'estado' => 'confirmado',
        ])->assertForbidden();

        $this->assertDatabaseMissing('verificaciones_bien', ['bien_patrimonial_id' => $bien->id]);
    }

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesPermisosSeeder::class);
        $this->proceso = ProcesoTransferencia::factory()->create();
        $this->dep = Dependencia::factory()->create(['proceso_transferencia_id' => $this->proceso->id, 'nivel' => 3]);
        $usuario = User::factory()->create();
        AsignacionRol::factory()->rol(Rol::RESPONSABLE_CENTRO_COSTO)->create([
            'user_id' => $usuario->id, 'dependencia_id' => $this->dep->id,
            'proceso_transferencia_id' => $this->proceso->id,
        ]);
        Sanctum::actingAs($usuario);
    }

    private function servidor(string $dni = '12345678'): Servidor
    {
        return Servidor::create([
            'proceso_transferencia_id' => $this->proceso->id, 'dependencia_id' => $this->dep->id,
            'dni' => $dni, 'nombres' => 'Responsable', 'apellidos' => 'Institucional', 'cargo' => 'Jefe de oficina',
        ]);
    }

    public function test_identificacion_automatica_se_muestra_sin_crear_un_informe_y_se_guarda_en_el_pdf(): void
    {
        $responsable = $this->servidor();
        $this->dep->update(['encargado_servidor_id' => $responsable->id]);
        $ajeno = $this->servidor('87654321');

        $this->getJson('/api/gestion/informe?dependencia_id='.$this->dep->id)->assertOk()
            ->assertJsonPath('data.responsable.id', $responsable->id)
            ->assertJsonPath('data.cabecera.cargo', 'Jefe de oficina')
            ->assertJsonPath('data.nivel_organizacional', 'tercer_nivel');
        $this->assertDatabaseCount('informes_gestion', 0);

        $this->postJson('/api/gestion/informe', [
            'dependencia_id' => $this->dep->id,
            'servidor_responsable_id' => $ajeno->id,
            'nivel_organizacional' => 'primer_nivel',
            'periodo_gestion' => '2025–2026',
            'funciones' => [['descripcion' => 'Coordinar los servicios institucionales']],
            'logros_items' => [['actividad' => 'Mejorar los servicios']],
        ])->assertOk()->assertJsonPath('data.servidor_responsable_id', $responsable->id)
            ->assertJsonPath('data.cargo_periodo', 'Jefe de oficina · 2025–2026')
            ->assertJsonPath('data.nivel_organizacional', 'primer_nivel');

        $vista = app(InformeGestionPdf::class)->datos($this->dep->id);
        $this->assertSame('Responsable Institucional', $vista['informe']['responsable']);
        $this->assertSame('Jefe de oficina · 2025–2026', $vista['informe']['cargo_periodo']);
    }

    public function test_correcciones_de_identificacion_se_conservan_y_salen_en_pdf_sin_modificar_padron(): void
    {
        $responsable = $this->servidor();
        $this->dep->update(['encargado_servidor_id' => $responsable->id]);
        $datos = [
            'dependencia_id' => $this->dep->id,
            'responsable_nombre' => 'Nombre Corregido',
            'cargo_responsable' => 'Jefe encargado de OTI',
            'nivel_organizacional' => 'segundo_nivel',
            'periodo_gestion' => '2025–2026',
            'funciones' => [['descripcion' => 'Coordinar servicios institucionales']],
            'logros_items' => [['actividad' => 'Mejorar los servicios']],
        ];
        $this->postJson('/api/gestion/informe', $datos)->assertOk();
        $this->getJson('/api/gestion/informe?dependencia_id='.$this->dep->id)->assertOk()
            ->assertJsonPath('data.responsable_nombre', 'Nombre Corregido')
            ->assertJsonPath('data.cargo_responsable', 'Jefe encargado de OTI')
            ->assertJsonPath('data.nivel_organizacional', 'segundo_nivel')
            ->assertJsonPath('data.periodo_gestion', '2025–2026');

        unset($datos['responsable_nombre'], $datos['cargo_responsable'], $datos['nivel_organizacional'], $datos['periodo_gestion']);
        $this->postJson('/api/gestion/informe', $datos)->assertOk()
            ->assertJsonPath('data.responsable_nombre', 'Nombre Corregido')
            ->assertJsonPath('data.cargo_periodo', 'Jefe encargado de OTI · 2025–2026')
            ->assertJsonPath('data.nivel_organizacional', 'segundo_nivel');

        $vista = app(InformeGestionPdf::class)->datos($this->dep->id);
        $this->assertSame('Nombre Corregido', $vista['informe']['responsable']);
        $this->assertSame('Jefe encargado de OTI · 2025–2026', $vista['informe']['cargo_periodo']);
        $this->assertSame('segundo_nivel', $vista['informe']['nivel_organizacional']);
        $this->assertSame('Responsable', $responsable->fresh()->nombres);
        $this->assertSame('Jefe de oficina', $responsable->fresh()->cargo);
        $this->assertSame(3, $this->dep->fresh()->nivel);
    }

    public function test_identificacion_editable_sigue_bloqueada_despues_de_remitir(): void
    {
        Entrega::create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->dep->id,
            'estado' => 'remitida',
        ]);
        $this->postJson('/api/gestion/informe', [
            'dependencia_id' => $this->dep->id,
            'responsable_nombre' => 'Cambio bloqueado',
            'funciones' => [['descripcion' => 'Coordinar servicios institucionales']],
            'logros_items' => [['actividad' => 'Mejorar los servicios']],
        ])->assertStatus(409);
        $this->assertDatabaseCount('informes_gestion', 0);
    }

    public function test_no_inventa_responsable_ni_cargo_si_faltan_en_el_padron(): void
    {
        $this->getJson('/api/gestion/informe?dependencia_id='.$this->dep->id)->assertOk()
            ->assertJsonPath('data.cabecera.responsable', null)
            ->assertJsonPath('data.cabecera.cargo', null);
        $this->assertDatabaseCount('informes_gestion', 0);
    }

    public function test_previsualizar_usa_pdf_oficial_sin_iniciar_firma_y_respeta_el_ambito(): void
    {
        $respuesta = $this->get('/api/firmaperu/previsualizar?tipo_documento=anexo02&dependencia_id='.$this->dep->id);
        $respuesta->assertOk()->assertHeader('Content-Type', 'application/pdf');
        $this->assertStringStartsWith('%PDF-', $respuesta->getContent());
        $this->assertStringContainsString('inline', $respuesta->headers->get('Content-Disposition'));
        $this->assertDatabaseCount('firma_sesiones', 0);
        $this->assertDatabaseCount('documentos_firma', 0);

        $otra = Dependencia::factory()->create(['proceso_transferencia_id' => $this->proceso->id]);
        $this->getJson('/api/firmaperu/previsualizar?tipo_documento=anexo05&dependencia_id='.$otra->id)->assertForbidden();
        $this->getJson('/api/firmaperu/previsualizar?tipo_documento=invalido&dependencia_id='.$this->dep->id)->assertUnprocessable();
    }

    public function test_proyeccion_de_personal_es_idempotente_y_conserva_correcciones_y_retiros(): void
    {
        $primero = $this->servidor();
        $segundo = $this->servidor('87654321');
        $servicio = app(IngestaPersonalSgd::class);
        $this->assertSame(['personal' => 2, 'omitidos' => 0], $servicio->ejecutar($this->proceso));
        $this->assertSame(['personal' => 2, 'omitidos' => 0], $servicio->ejecutar($this->proceso));
        $this->assertDatabaseCount('personal', 2);

        Personal::where('servidor_id', $primero->id)->firstOrFail()->update(['cargo' => 'Cargo validado', 'fuente' => 'manual']);
        Personal::where('servidor_id', $segundo->id)->firstOrFail()->delete();
        $this->assertSame(['personal' => 0, 'omitidos' => 2], $servicio->ejecutar($this->proceso));

        $this->getJson('/api/personal?dependencia_id='.$this->dep->id.'&search=validado')->assertOk()
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.cargo', 'Cargo validado');
        $pdf = app(PersonalPdf::class)->datos($this->dep->id);
        $this->assertCount(1, $pdf['personal']);
        $this->assertSame('Cargo validado', $pdf['personal'][0]['cargo']);
    }

    public function test_listado_personal_excluye_registros_de_otro_proceso(): void
    {
        $this->servidor();
        app(IngestaPersonalSgd::class)->ejecutar($this->proceso);
        $anterior = ProcesoTransferencia::factory()->cerrado()->create();
        Personal::create([
            'proceso_transferencia_id' => $anterior->id, 'dependencia_id' => $this->dep->id,
            'dni' => '99999999', 'nombres' => 'Proceso anterior',
        ]);
        $this->getJson('/api/personal?dependencia_id='.$this->dep->id)->assertOk()
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.dni', '12345678');
    }

    public function test_precarga_no_modifica_personal_de_entregas_ya_remitidas(): void
    {
        $this->servidor();
        Entrega::create(['proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->dep->id, 'estado' => 'remitida']);
        $this->assertSame(['personal' => 0, 'omitidos' => 0], app(IngestaPersonalSgd::class)->ejecutar($this->proceso));
        $this->assertDatabaseCount('personal', 0);
    }
}

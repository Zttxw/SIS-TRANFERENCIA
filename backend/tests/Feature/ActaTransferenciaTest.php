<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Gestion\Models\InformeGestion;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\ActaTransferencia;
use App\Modules\Transferencia\Models\Observacion;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Modules\Transferencia\Services\ActaPdf;
use App\Support\Enums\CalidadEtte;
use App\Support\Enums\EstadoEntrega;
use App\Support\Enums\EstadoObservacion;
use App\Support\Enums\Rol;
use Database\Seeders\RolesPermisosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\PreparaEntregas;
use Tests\TestCase;

/**
 * Acta 07 conforme al formato de la directiva (fase 8): se emite antes de
 * remitir; la condición de cada documento sale de la presencia de registros y
 * las partes la ajustan antes de firmar ("No aplica" solo en el Anexo 06 y
 * otros); lleva lugar, fecha y hora; la recepción la firma el coordinador ETTE
 * o el titular que lo suplió; la sección IV recoge las observaciones del
 * coordinador. Una vez suscrita, el acta queda fija.
 */
class ActaTransferenciaTest extends TestCase
{
    use PreparaEntregas, RefreshDatabase;

    private ProcesoTransferencia $proceso;

    private Dependencia $padre;

    private Dependencia $dep;

    private User $responsable;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesPermisosSeeder::class);
        $this->proceso = ProcesoTransferencia::factory()->create(['estado' => 'abierto']);
        $this->padre = Dependencia::factory()->create(['proceso_transferencia_id' => $this->proceso->id, 'codigo' => '07', 'nombre' => 'Planeamiento']);
        $this->dep = Dependencia::factory()->hijaDe($this->padre)->create(['codigo' => '07.05', 'nivel' => 3]);
        $this->responsable = $this->usuario(Rol::RESPONSABLE_CENTRO_COSTO, 'Responsable OTI');
    }

    private function usuario(Rol $rol, string $nombre, ?int $dependenciaId = null): User
    {
        $usuario = User::factory()->create(['name' => $nombre, 'dni' => fake()->unique()->numerify('########'), 'activo' => true]);
        AsignacionRol::factory()->rol($rol)->create([
            'user_id' => $usuario->id,
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $rol === Rol::ETTE ? null : ($dependenciaId ?? $this->dep->id),
        ]);
        Sanctum::actingAs($usuario);

        return $usuario;
    }

    private function url(): string
    {
        return "/api/transferencia/acta?dependencia_id={$this->dep->id}";
    }

    /** @param array<string, mixed> $datos */
    private function guardar(array $datos): TestResponse
    {
        return $this->putJson('/api/transferencia/acta', ['dependencia_id' => $this->dep->id, ...$datos]);
    }

    /** @return array<string, mixed> */
    private function datosPdf(): array
    {
        return app(ActaPdf::class)->datos($this->dep->id, $this->responsable)['acta'];
    }

    public function test_el_acta_se_emite_antes_de_remitir_con_lugar_por_defecto(): void
    {
        $this->getJson($this->url())
            ->assertOk()
            ->assertJsonPath('data.version', 1)
            ->assertJsonPath('data.estado', 'generada')
            ->assertJsonPath('data.lugar', 'San Jerónimo, Cusco')
            ->assertJsonPath('data.editable', true);
    }

    public function test_la_condicion_por_defecto_sale_de_la_presencia_de_registros(): void
    {
        InformeGestion::create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->dep->id,
            'funciones' => [['n' => 1, 'descripcion' => 'Funciones del centro de costo de prueba.']],
            'estado' => 'completado',
        ]);

        $this->getJson($this->url())->assertOk()
            ->assertJsonPath('data.anexos_entregados.anexo_02.condicion', 'entregado')
            ->assertJsonPath('data.anexos_entregados.anexo_03.condicion', 'no_entregado')
            ->assertJsonPath('data.anexos_entregados.anexo_06.condicion', 'no_entregado')
            ->assertJsonPath('data.anexos_entregados.otros.condicion', 'no_aplica');
    }

    public function test_las_partes_completan_el_acta_y_el_pdf_lo_refleja(): void
    {
        $this->guardar([
            'fecha_acta' => '2026-12-03',
            'hora' => '10:30',
            'lugar' => 'San Jerónimo, Cusco',
            'otros_documentos' => 'Inventario de llaves de la oficina.',
            'observaciones' => 'Reunión presencial en la sala de regidores.',
            'condiciones' => [
                'anexo_06' => ['condicion' => 'no_aplica', 'observacion' => 'La oficina no tiene bienes no patrimoniales.'],
            ],
        ])->assertOk()->assertJsonPath('data.anexos_entregados.anexo_06.manual', true);

        $acta = $this->datosPdf();
        $this->assertSame(['10:30', 3, 'diciembre', 2026], [$acta['hora'], $acta['dia'], $acta['mes'], $acta['anio']]);
        $filas = collect($acta['anexos'])->keyBy('nombre');
        $this->assertSame('no_aplica', $filas['Anexo N° 06 — Bienes No Patrimoniales']['condicion']);
        $this->assertSame('La oficina no tiene bienes no patrimoniales.', $filas['Anexo N° 06 — Bienes No Patrimoniales']['observacion']);
        // Al describir otros documentos, "otros" pasa a entregado por defecto.
        $this->assertSame('entregado', $filas['Otros documentos']['condicion']);
        $this->assertSame('Reunión presencial en la sala de regidores.', $acta['comentarios']);
        $this->assertSame(['07', 'Planeamiento', 3], [$acta['unidad_superior_codigo'], $acta['unidad_superior'], $acta['nivel']]);
    }

    public function test_no_aplica_solo_se_admite_en_el_anexo_06_y_otros(): void
    {
        $this->guardar(['condiciones' => ['anexo_03' => ['condicion' => 'no_aplica']]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('condiciones.anexo_03.condicion');
    }

    public function test_la_condicion_fijada_a_mano_no_se_recalcula(): void
    {
        $this->guardar(['condiciones' => ['anexo_02' => ['condicion' => 'no_entregado']]])->assertOk();
        InformeGestion::create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->dep->id,
            'funciones' => [['n' => 1, 'descripcion' => 'Funciones registradas después.']],
            'estado' => 'completado',
        ]);

        $this->getJson($this->url())->assertOk()
            ->assertJsonPath('data.anexos_entregados.anexo_02.condicion', 'no_entregado');
    }

    public function test_la_recepcion_es_del_coordinador_o_del_titular_designado_en_suplencia(): void
    {
        $this->usuario(Rol::DELEGADO_ETTE, 'Coordinadora Asignada');
        $this->assertSame('Coordinadora Asignada', $this->datosPdf()['recepcion']['nombre']);
        $this->assertSame('Coordinador acreditado por el ETTE', $this->datosPdf()['recepcion']['calidad']);

        $titular = $this->usuario(Rol::ETTE, 'Titular Suplente');
        $this->entregaEn($this->dep)->update([
            'titular_suplente_id' => $titular->id,
            'motivo_suplencia_ette' => 'Coordinadora con licencia.',
        ]);

        $recepcion = $this->datosPdf()['recepcion'];
        $this->assertSame(['Titular Suplente', CalidadEtte::TITULAR_SUPLENTE->etiqueta()], [$recepcion['nombre'], $recepcion['calidad']]);
    }

    public function test_la_seccion_iv_recoge_las_observaciones_vigentes_del_coordinador(): void
    {
        $coordinador = $this->usuario(Rol::DELEGADO_ETTE, 'Coordinadora');
        foreach ([EstadoObservacion::REGISTRADA, EstadoObservacion::RETIRADA] as $estado) {
            Observacion::create([
                'proceso_transferencia_id' => $this->proceso->id,
                'dependencia_id' => $this->dep->id,
                'anexo' => 'acervo',
                'autor_id' => $coordinador->id,
                'en_calidad_de' => CalidadEtte::COORDINADOR,
                'descripcion' => "Observación {$estado->value}",
                'estado' => $estado,
            ]);
        }

        $observaciones = $this->datosPdf()['observaciones'];
        $this->assertCount(1, $observaciones);
        $this->assertSame('Observación registrada', $observaciones[0]['descripcion']);
        $this->assertSame('Anexo 03 — Acervo (anexo completo)', $observaciones[0]['documentacion']);
        $this->getJson($this->url())->assertOk()->assertJsonCount(1, 'data.observaciones_registradas');
    }

    public function test_el_coordinador_consulta_el_acta_pero_la_completa_el_responsable(): void
    {
        $this->getJson($this->url())->assertOk();
        $this->usuario(Rol::DELEGADO_ETTE, 'Coordinadora');

        $this->getJson($this->url())->assertOk();
        $this->guardar(['hora' => '16:00'])->assertForbidden();
    }

    public function test_suscrita_el_acta_queda_fija(): void
    {
        $this->getJson($this->url())->assertOk();
        $this->entregaEn($this->dep, EstadoEntrega::ACTA_SUSCRITA);

        $this->guardar(['hora' => '09:00'])->assertConflict();

        // Reemplazar al coordinador después de suscribir no cambia el acta firmada.
        $this->usuario(Rol::DELEGADO_ETTE, 'Coordinador Nuevo');
        $this->assertSame('', $this->datosPdf()['recepcion']['nombre']);
        $this->assertNull(ActaTransferencia::firstOrFail()->hora);
    }
}

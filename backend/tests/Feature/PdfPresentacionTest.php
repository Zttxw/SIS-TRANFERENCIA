<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Gestion\Models\InformeGestion;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Organization\Models\Servidor;
use App\Modules\Transferencia\Models\ActaTransferencia;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Modules\Transferencia\Services\ActaPdf;
use App\Modules\Transferencia\Services\FirmaperuPdfService;
use App\Support\Enums\Rol;
use Database\Seeders\RolesPermisosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PdfPresentacionTest extends TestCase
{
    use RefreshDatabase;

    public function test_informe_con_filas_de_varias_lineas_no_genera_una_pagina_por_fila(): void
    {
        $proceso = ProcesoTransferencia::factory()->create();
        $dep = Dependencia::factory()->create(['proceso_transferencia_id' => $proceso->id]);
        InformeGestion::create([
            'proceso_transferencia_id' => $proceso->id, 'dependencia_id' => $dep->id,
            'funciones' => array_fill(0, 6, ['descripcion' => 'Administrar y mantener la infraestructura tecnológica institucional.']),
            'logros_items' => array_fill(0, 6, [
                'actividad' => 'Implementación de mejoras en el sistema de transferencia de gestión 2026.',
                'resultado' => 'Se habilitaron funcionalidades para el registro, revisión y seguimiento de información de transferencia.',
                'indicador' => '100% de los módulos priorizados para la primera etapa implementados.',
                'verificacion' => 'Informe técnico, capturas del sistema y acta de pruebas.',
            ]),
            'dificultades_items' => array_fill(0, 6, [
                'dificultad' => 'Equipos informáticos con componentes obsoletos y limitaciones de hardware.',
                'efecto' => 'Retrasos en las actividades administrativas y dificultades para ejecutar aplicaciones institucionales.',
                'medida' => 'Programar la renovación progresiva de equipos según prioridad y disponibilidad presupuestal.',
            ]),
            'pendientes_items' => array_fill(0, 4, [
                'asunto' => 'Continuar con la implementación del Sistema de Transferencia de Gestión 2026.',
                'estado_accion' => 'En desarrollo. Completar funcionalidades, realizar pruebas y gestionar la puesta en producción.',
                'documento_referencia' => 'Informe técnico de desarrollo.', 'plazo' => 'Noviembre 2026', 'responsable' => 'OTI / Equipo de desarrollo',
            ]),
        ]);
        $pdf = app(FirmaperuPdfService::class)->capturar('anexo02', $dep->id, User::factory()->make())['pdf'];
        $this->assertStringStartsWith('%PDF-', $pdf);
        $paginas = preg_match_all('/\/Type\s*\/Page\b/', $pdf);
        $this->assertGreaterThan(0, $paginas);
        $this->assertLessThanOrEqual(3, $paginas, 'Las filas multilínea deben fluir juntas, sin páginas en blanco ni filas de una página completa.');
    }

    public function test_acta_identifica_al_jefe_de_la_oficina_aunque_la_consulte_el_padre(): void
    {
        $this->seed(RolesPermisosSeeder::class);
        $proceso = ProcesoTransferencia::factory()->create();
        $padre = Dependencia::factory()->create(['proceso_transferencia_id' => $proceso->id, 'nombre' => 'Planeamiento']);
        $dep = Dependencia::factory()->hijaDe($padre)->create();
        $servidor = Servidor::create(['proceso_transferencia_id' => $proceso->id, 'dependencia_id' => $dep->id,
            'dni' => '12345678', 'nombres' => 'Adriana', 'apellidos' => 'Quispe', 'cargo' => 'Directora de OTI']);
        $jefe = User::factory()->create(['servidor_id' => $servidor->id, 'dni' => $servidor->dni, 'name' => 'Adriana Quispe', 'activo' => true]);
        $revisor = User::factory()->create(['name' => 'Responsable de Planeamiento', 'activo' => true]);
        foreach ([[$jefe, $dep], [$revisor, $padre]] as [$cuenta, $oficina]) {
            AsignacionRol::factory()->rol(Rol::RESPONSABLE_CENTRO_COSTO)->create(['user_id' => $cuenta->id,
                'dependencia_id' => $oficina->id, 'proceso_transferencia_id' => $proceso->id]);
        }
        Sanctum::actingAs($revisor);
        $url = '/api/transferencia/acta?dependencia_id='.$dep->id;
        $this->getJson($url)->assertOk()->assertJsonPath('data.intervinientes.titular_saliente.nombre', 'Adriana Quispe')
            ->assertJsonPath('data.intervinientes.titular_saliente.dni', '12345678')
            ->assertJsonPath('data.intervinientes.titular_saliente.cargo', 'Directora de OTI')
            ->assertJsonPath('data.dependencia.padre.nombre', 'Planeamiento');
        $datos = app(ActaPdf::class)->datos($dep->id, $revisor);
        $this->assertSame(['nombre' => 'Adriana Quispe', 'dni' => '12345678', 'cargo' => 'Directora de OTI'], $datos['acta']['entrega']);
        $this->assertSame('Planeamiento', $datos['acta']['unidad_superior']);

        ActaTransferencia::where('dependencia_id', $dep->id)->update(['intervinientes' => ['titular_saliente' => ['nombre' => 'Nombre corregido manualmente']]]);
        $this->getJson($url)->assertOk()->assertJsonPath('data.intervinientes.titular_saliente.nombre', 'Nombre corregido manualmente')
            ->assertJsonPath('data.intervinientes.titular_saliente.dni', '12345678')
            ->assertJsonPath('data.intervinientes.titular_saliente.cargo', 'Directora de OTI');
    }

    public function test_acta_recupera_el_encargado_del_padron_si_aun_no_tiene_cuenta(): void
    {
        $proceso = ProcesoTransferencia::factory()->create();
        $dep = Dependencia::factory()->create(['proceso_transferencia_id' => $proceso->id]);
        $servidor = Servidor::create(['proceso_transferencia_id' => $proceso->id, 'dependencia_id' => $dep->id,
            'dni' => '87654321', 'nombres' => 'Jefe', 'apellidos' => 'Del Padrón', 'cargo' => 'Director']);
        $dep->update(['encargado_servidor_id' => $servidor->id]);
        $datos = app(ActaPdf::class)->datos($dep->id, User::factory()->create());
        $this->assertSame(['nombre' => 'Jefe Del Padrón', 'dni' => '87654321', 'cargo' => 'Director'], $datos['acta']['entrega']);
    }
}

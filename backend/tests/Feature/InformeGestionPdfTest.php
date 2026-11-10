<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Gestion\Models\InformeGestion;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\Entrega;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\EstadoEntrega;
use App\Support\Enums\Rol;
use Database\Seeders\RolesPermisosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * PDF oficial del Anexo 02 (F5). Vertical de referencia: se emite en cualquier
 * estado (borrador incluido), acotado al ámbito y con el formato de la directiva.
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

    public function test_pdf_de_informe_consolidado_no_lleva_sufijo_borrador(): void
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
            'estado' => EstadoEntrega::CONSOLIDADA,
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
}

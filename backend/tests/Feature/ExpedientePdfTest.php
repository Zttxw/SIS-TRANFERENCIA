<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Gestion\Models\InformeGestion;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\Entrega;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Modules\Transferencia\Services\CadenaFirmas;
use App\Support\Enums\EstadoEntrega;
use App\Support\Enums\Rol;
use Database\Seeders\RolesPermisosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Paquete de entrega (F5): expediente PDF único de todos los anexos de una
 * dependencia. Exige entrega remitida.
 */
class ExpedientePdfTest extends TestCase
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

    private function servidor(): User
    {
        $usuario = User::factory()->create();
        AsignacionRol::factory()->rol(Rol::SERVIDOR)->create([
            'user_id' => $usuario->id,
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->dep->id,
        ]);
        Sanctum::actingAs($usuario);

        return $usuario;
    }

    private function entrega(EstadoEntrega $estado): void
    {
        Entrega::create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->dep->id,
            'dependencia_destino_id' => $this->dep->parent_id,
            'estado' => $estado,
        ]);
    }

    public function test_expediente_exige_entrega_remitida(): void
    {
        $this->servidor();
        $this->entrega(EstadoEntrega::VERIFICADA);

        $this->get("/api/expediente/pdf?dependencia_id={$this->dep->id}")
            ->assertStatus(409);
    }

    public function test_expediente_remitido_produce_pdf_con_anexos_presentes(): void
    {
        $this->servidor();
        $this->entrega(EstadoEntrega::REMITIDA);

        InformeGestion::create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->dep->id,
            'funciones' => [['n' => 1, 'descripcion' => 'Función de prueba.']],
            'estado' => 'completado',
        ]);

        $r = $this->get("/api/expediente/pdf?dependencia_id={$this->dep->id}");
        $r->assertOk();
        $r->assertHeader('content-type', 'application/pdf');
        $this->assertStringStartsWith('%PDF', $r->streamedContent());
    }

    public function test_expediente_firmado_exige_entrega_remitida(): void
    {
        $this->servidor();
        $this->entrega(EstadoEntrega::ACTA_SUSCRITA);

        $this->get("/api/expediente/firmado?dependencia_id={$this->dep->id}")->assertStatus(409);
    }

    public function test_expediente_firmado_incluye_los_pdf_finales_con_ambas_firmas(): void
    {
        Storage::fake('local');
        Storage::disk('local')->put('firmaperu/s1/firmado.pdf', '%PDF-firmado');
        $this->partialMock(CadenaFirmas::class, function ($mock): void {
            $mock->shouldReceive('estado')->andReturnUsing(fn (int $proceso, int $dep, string $tipo): array => [
                'completo' => $tipo !== 'anexo06', 'firmado_path' => 'firmaperu/s1/firmado.pdf',
                'sesion_final_id' => null, 'hay_firma_digital' => true, 'entidad' => null, 'ette' => null,
            ]);
        });
        $this->servidor();
        $this->entrega(EstadoEntrega::RECIBIDA_ETTE);

        $respuesta = $this->get("/api/expediente/firmado?dependencia_id={$this->dep->id}")->assertOk();

        $zip = new \ZipArchive;
        $zip->open($respuesta->baseResponse->getFile()->getPathname());
        $nombres = collect(range(0, $zip->numFiles - 1))->map(fn (int $i): string => (string) $zip->getNameIndex($i));
        $this->assertCount(6, $nombres, 'Consulta + 5 anexos completos; el 06 sin ambas firmas no entra.');
        $this->assertTrue($nombres->contains(fn (string $n): bool => str_ends_with($n, 'Anexo-07-Acta-de-transferencia-firmado.pdf')));
        $this->assertFalse($nombres->contains(fn (string $n): bool => str_contains($n, 'Anexo-06')));
    }
}

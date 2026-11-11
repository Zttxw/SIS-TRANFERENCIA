<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Documentos\Models\DocumentoPendiente;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\FuenteDato;
use App\Support\Enums\Rol;
use Database\Seeders\RolesPermisosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * E1 (RF-001, D-04): el documento pendiente separa `asunto` de `sumilla` y
 * `justificacion_pendiente`. La justificación es obligatoria en complementos
 * (fuente != sgd) y opcional en los ingeridos del SGD.
 */
class DocumentoPendienteSumillaTest extends TestCase
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

    public function test_alta_manual_exige_justificacion_de_pendiente(): void
    {
        // Un alta por el CRUD es complemento (fuente manual): sin justificación → 422.
        $this->servidor();

        $this->postJson('/api/documentos-pendientes', [
            'dependencia_id' => $this->dep->id,
            'asunto' => 'Oficio pendiente de respuesta',
            'sumilla' => 'Solicitud de información a la gerencia.',
        ])->assertStatus(422)->assertJsonValidationErrors('justificacion_pendiente');
    }

    public function test_alta_manual_con_justificacion_y_sumilla_se_guarda(): void
    {
        $this->servidor();

        $this->postJson('/api/documentos-pendientes', [
            'dependencia_id' => $this->dep->id,
            'asunto' => 'Oficio pendiente de respuesta',
            'sumilla' => 'Solicitud de información a la gerencia.',
            'justificacion_pendiente' => 'En trámite tras el corte; espera respuesta externa.',
        ])->assertCreated();

        $doc = DocumentoPendiente::where('dependencia_id', $this->dep->id)->firstOrFail();
        $this->assertSame('Solicitud de información a la gerencia.', $doc->sumilla);
        $this->assertNotNull($doc->justificacion_pendiente);
        $this->assertSame(FuenteDato::MANUAL, $doc->fuente);
    }

    public function test_editar_documento_ingerido_del_sgd_no_exige_justificacion(): void
    {
        $this->servidor();

        $doc = DocumentoPendiente::create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->dep->id,
            'asunto' => 'Documento ingerido del SGD',
            'fuente' => FuenteDato::SGD->value,
            'extraido_en' => now(),
        ]);

        // Editar un registro SGD sin justificación es válido (no es complemento).
        $this->putJson("/api/documentos-pendientes/{$doc->id}", [
            'dependencia_id' => $this->dep->id,
            'asunto' => 'Documento ingerido del SGD (actualizado)',
            'sumilla' => 'Resumen agregado por el servidor.',
        ])->assertOk();

        $this->assertSame('Resumen agregado por el servidor.', $doc->fresh()->sumilla);
    }
}

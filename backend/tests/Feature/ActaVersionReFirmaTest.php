<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\ActaTransferencia;
use App\Modules\Transferencia\Models\FirmaAnexo;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\CaracterFirma;
use App\Support\Enums\EstadoFirma;
use App\Support\Enums\Rol;
use Database\Seeders\RolesPermisosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * B3c (D-06): corregir una entrega OBSERVADA y volver a remitir genera una
 * nueva versión del acta e invalida las firmas OBLIGATORIAS de la versión
 * anterior (re-firma). Una firma vieja no ampara la versión corregida; las
 * firmas previas quedan históricas sobre su propia versión.
 */
class ActaVersionReFirmaTest extends TestCase
{
    use RefreshDatabase;

    private ProcesoTransferencia $proceso;

    private Dependencia $padre;

    private Dependencia $hija;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesPermisosSeeder::class);
        $this->proceso = ProcesoTransferencia::factory()->create();
        $this->padre = Dependencia::factory()->create([
            'proceso_transferencia_id' => $this->proceso->id,
            'nivel' => 2,
        ]);
        $this->hija = Dependencia::factory()->hijaDe($this->padre)->create();
    }

    private function actuarComo(Rol $rol, Dependencia $dependencia): User
    {
        $usuario = User::factory()->create();
        AsignacionRol::factory()->rol($rol)->create([
            'user_id' => $usuario->id,
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $dependencia->id,
        ]);
        Sanctum::actingAs($usuario);

        return $usuario;
    }

    private function emitirActa(): ActaTransferencia
    {
        $this->getJson("/api/transferencia/acta?dependencia_id={$this->hija->id}")->assertOk();

        return ActaTransferencia::where('dependencia_id', $this->hija->id)->firstOrFail();
    }

    public function test_re_remitir_tras_observar_sube_version_e_invalida_firmas_obligatorias(): void
    {
        // La hija emite el acta (pre-remisión) y registra sus firmas de versión 1.
        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->hija);
        $acta = $this->emitirActa();

        $obligatoria = FirmaAnexo::factory()->firmada()->create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->hija->id,
            'firmable_type' => $acta->getMorphClass(),
            'firmable_id' => $acta->id,
            'version' => 1,
            'caracter' => CaracterFirma::OBLIGATORIA,
        ]);
        $opcional = FirmaAnexo::factory()->firmada()->create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->hija->id,
            'firmable_type' => $acta->getMorphClass(),
            'firmable_id' => $acta->id,
            'version' => 1,
            'caracter' => CaracterFirma::OPCIONAL,
        ]);

        // Remite, el padre observa.
        $this->postJson('/api/transferencia/remitir', ['dependencia_id' => $this->hija->id])->assertOk();
        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->padre);
        $this->postJson('/api/transferencia/revisar', [
            'dependencia_id' => $this->hija->id,
            'accion' => 'observar',
            'comentario' => 'Corrige el Anexo 04.',
        ])->assertOk();

        // La hija corrige y vuelve a remitir: el acta sube de versión.
        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->hija);
        $this->postJson('/api/transferencia/remitir', ['dependencia_id' => $this->hija->id])->assertOk();

        $acta->refresh();
        $this->assertSame(2, $acta->version);
        $this->assertSame('generada', $acta->estado);

        // La firma obligatoria de la versión 1 quedó cancelada (re-firma);
        // la opcional no se toca.
        $this->assertSame(EstadoFirma::CANCELADA, $obligatoria->fresh()->estado);
        $this->assertSame(EstadoFirma::FIRMADA, $opcional->fresh()->estado);
    }

    public function test_primera_remision_no_versiona_ni_invalida_firmas(): void
    {
        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->hija);
        $acta = $this->emitirActa();

        $obligatoria = FirmaAnexo::factory()->firmada()->create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->hija->id,
            'firmable_type' => $acta->getMorphClass(),
            'firmable_id' => $acta->id,
            'version' => 1,
            'caracter' => CaracterFirma::OBLIGATORIA,
        ]);

        // Primera remisión (desde borrador, sin observación previa): no versiona.
        $this->postJson('/api/transferencia/remitir', ['dependencia_id' => $this->hija->id])->assertOk();

        $this->assertSame(1, $acta->fresh()->version);
        $this->assertSame(EstadoFirma::FIRMADA, $obligatoria->fresh()->estado);
    }
}

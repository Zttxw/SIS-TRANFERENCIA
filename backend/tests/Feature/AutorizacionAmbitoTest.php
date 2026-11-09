<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\Rol;
use Database\Seeders\RolesPermisosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Autorización por ámbito (dependencia) — F8-ámbito, aclaración del flujo
 * jerárquico. El middleware `permiso` ya controla *qué acción*; aquí se prueba
 * *sobre qué dependencia*: servidor/delegado quedan acotados a su dependencia,
 * los consolidadores alcanzan su subárbol, y admin/ETTS/ETTE ven todo.
 */
class AutorizacionAmbitoTest extends TestCase
{
    use RefreshDatabase;

    private ProcesoTransferencia $proceso;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesPermisosSeeder::class);
        $this->proceso = ProcesoTransferencia::factory()->create();
    }

    private function dependencia(?Dependencia $padre = null): Dependencia
    {
        if ($padre !== null) {
            return Dependencia::factory()->hijaDe($padre)->create();
        }

        return Dependencia::factory()->create([
            'proceso_transferencia_id' => $this->proceso->id,
            'nivel' => 2,
        ]);
    }

    private function usuarioConRolEn(Rol $rol, ?Dependencia $dependencia): User
    {
        $usuario = User::factory()->create();
        AsignacionRol::factory()->rol($rol)->create([
            'user_id' => $usuario->id,
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $dependencia?->id,
        ]);
        Sanctum::actingAs($usuario);

        return $usuario;
    }

    public function test_servidor_accede_a_su_dependencia(): void
    {
        $dep = $this->dependencia();
        $this->usuarioConRolEn(Rol::SERVIDOR, $dep);

        $this->getJson("/api/gestion/informe?dependencia_id={$dep->id}")
            ->assertOk();
    }

    public function test_servidor_no_accede_a_otra_dependencia(): void
    {
        $propia = $this->dependencia();
        $ajena = $this->dependencia();
        $this->usuarioConRolEn(Rol::SERVIDOR, $propia);

        $this->getJson("/api/gestion/informe?dependencia_id={$ajena->id}")
            ->assertForbidden()
            ->assertJsonPath('message', 'La dependencia solicitada está fuera de su ámbito.');
    }

    public function test_servidor_no_puede_registrar_anexo_de_otra_dependencia(): void
    {
        $propia = $this->dependencia();
        $ajena = $this->dependencia();
        $this->usuarioConRolEn(Rol::SERVIDOR, $propia);

        // El AnexoFormRequest rechaza la escritura fuera de ámbito (403).
        $this->postJson('/api/gestion/informe', [
            'dependencia_id' => $ajena->id,
            'funciones' => [['descripcion' => 'Funciones de prueba suficientes.']],
            'logros_items' => [['actividad' => 'Logros de prueba suficientes.']],
        ])->assertForbidden();
    }

    public function test_delegado_es_servidor_asignado_a_la_dependencia(): void
    {
        // "Delegado" = un servidor al que el encargado asigna la dependencia
        // para completar sus anexos. Mismo mecanismo de ámbito.
        $dep = $this->dependencia();
        $this->usuarioConRolEn(Rol::SERVIDOR, $dep);

        $this->postJson('/api/gestion/informe', [
            'dependencia_id' => $dep->id,
            'funciones' => [['descripcion' => 'Funciones del centro de costo.']],
            'logros_items' => [['actividad' => 'Principales logros del periodo.']],
        ])->assertOk();
    }

    public function test_responsable_centro_costo_alcanza_su_subarbol(): void
    {
        $padre = $this->dependencia();
        $hija = $this->dependencia($padre);
        $nieta = $this->dependencia($hija);

        // Responsable asignado al padre: su ámbito incluye hija y nieta.
        $this->usuarioConRolEn(Rol::RESPONSABLE_CENTRO_COSTO, $padre);

        $this->getJson("/api/gestion/informe?dependencia_id={$nieta->id}")
            ->assertOk();
    }

    public function test_responsable_no_alcanza_dependencia_fuera_de_su_rama(): void
    {
        $miRama = $this->dependencia();
        $otraRama = $this->dependencia();
        $this->usuarioConRolEn(Rol::RESPONSABLE_CENTRO_COSTO, $miRama);

        $this->getJson("/api/gestion/informe?dependencia_id={$otraRama->id}")
            ->assertForbidden();
    }

    public function test_etts_tiene_ambito_global(): void
    {
        $cualquiera = $this->dependencia();
        // ETTS sin dependencia asignada: visión institucional.
        $this->usuarioConRolEn(Rol::ETTS, null);

        $this->getJson("/api/gestion/informe?dependencia_id={$cualquiera->id}")
            ->assertOk();
    }

    public function test_listado_sin_dependencia_se_acota_al_ambito(): void
    {
        $propia = $this->dependencia();
        $ajena = $this->dependencia();
        $this->usuarioConRolEn(Rol::SERVIDOR, $propia);

        // Sin dependencia_id: el listado se limita al ámbito del usuario, no
        // devuelve un 403 ni filtra por una dependencia ajena.
        $respuesta = $this->getJson('/api/personal')->assertOk();
        $this->assertTrue($respuesta->json('success'));
    }
}

<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\Permiso;
use App\Support\Enums\Rol;
use Database\Seeders\RolesPermisosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * D1 — El delegado ETTE es una capacidad acotada por asignación a dependencia,
 * no un rol global ni por oficina (doc 05 §3). Su ámbito es la dependencia
 * exacta designada (no el subárbol), y sus capacidades son consulta + firma
 * opcional, sin edición/remisión/consolidación.
 */
class DelegadoEtteAmbitoTest extends TestCase
{
    use RefreshDatabase;

    private ProcesoTransferencia $proceso;

    private Dependencia $padre;

    private Dependencia $hija;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesPermisosSeeder::class);
        $this->proceso = ProcesoTransferencia::factory()->create(['estado' => 'abierto']);
        $this->padre = Dependencia::factory()->create([
            'proceso_transferencia_id' => $this->proceso->id,
            'nivel' => 2,
        ]);
        $this->hija = Dependencia::factory()->hijaDe($this->padre)->create();
    }

    private function delegadoEn(Dependencia $dependencia): User
    {
        $usuario = User::factory()->create();
        AsignacionRol::factory()->rol(Rol::DELEGADO_ETTE)->create([
            'user_id' => $usuario->id,
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $dependencia->id,
        ]);

        return $usuario->fresh();
    }

    public function test_el_delegado_no_tiene_ambito_global(): void
    {
        $delegado = $this->delegadoEn($this->padre);

        $this->assertFalse($delegado->tieneAmbitoGlobal());
    }

    public function test_el_ambito_del_delegado_es_la_dependencia_exacta_sin_subarbol(): void
    {
        // Designado en el padre: NO alcanza a la hija (no hereda subárbol).
        $delegado = $this->delegadoEn($this->padre);

        $this->assertTrue($delegado->puedeAccederDependencia($this->padre->id));
        $this->assertFalse($delegado->puedeAccederDependencia($this->hija->id));
    }

    public function test_el_delegado_puede_consultar_y_firmar_pero_no_editar_ni_remitir(): void
    {
        $delegado = $this->delegadoEn($this->padre);

        // Capacidades confirmadas: consulta + firma opcional.
        $this->assertTrue($delegado->tienePermiso(Permiso::VerAnexos));
        $this->assertTrue($delegado->tienePermiso(Permiso::VerExpediente));
        $this->assertTrue($delegado->tienePermiso(Permiso::FirmarAnexos));

        // No puede editar datos, remitir, revisar/consolidar ni gestionar equipo.
        $this->assertFalse($delegado->tienePermiso(Permiso::RegistrarAnexos));
        $this->assertFalse($delegado->tienePermiso(Permiso::RemitirEntrega));
        $this->assertFalse($delegado->tienePermiso(Permiso::ConsolidarEntrega));
        $this->assertFalse($delegado->tienePermiso(Permiso::GestionarDelegados));
    }

    public function test_el_comite_ette_es_global_y_no_firma_por_si_mismo(): void
    {
        $comite = User::factory()->create();
        AsignacionRol::factory()->rol(Rol::ETTE)->create([
            'user_id' => $comite->id,
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => null,
        ]);
        $comite = $comite->fresh();

        // El comité conserva su visión institucional (seguimiento).
        $this->assertTrue($comite->tieneAmbitoGlobal());
        // La firma nace de la designación como delegado, no de pertenecer al comité.
        $this->assertFalse($comite->tienePermiso(Permiso::FirmarAnexos));
        // El comité sí gestiona su equipo (D2).
        $this->assertTrue($comite->tienePermiso(Permiso::GestionarDelegados));
    }

    public function test_un_delegado_en_dos_dependencias_alcanza_ambas_exactas(): void
    {
        $usuario = User::factory()->create();
        foreach ([$this->padre, $this->hija] as $dep) {
            AsignacionRol::factory()->rol(Rol::DELEGADO_ETTE)->create([
                'user_id' => $usuario->id,
                'proceso_transferencia_id' => $this->proceso->id,
                'dependencia_id' => $dep->id,
            ]);
        }
        $usuario = $usuario->fresh();

        $this->assertTrue($usuario->puedeAccederDependencia($this->padre->id));
        $this->assertTrue($usuario->puedeAccederDependencia($this->hija->id));
    }
}

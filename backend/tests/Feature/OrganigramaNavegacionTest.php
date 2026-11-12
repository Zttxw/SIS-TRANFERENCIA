<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Organization\Models\Servidor;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\Rol;
use Database\Seeders\RolesPermisosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OrganigramaNavegacionTest extends TestCase
{
    use RefreshDatabase;

    public function test_jefe_ve_estructura_completa_y_su_oficina_sin_ampliar_el_acceso_a_anexos(): void
    {
        $this->seed(RolesPermisosSeeder::class);
        $proceso = ProcesoTransferencia::factory()->create();
        $raiz = Dependencia::factory()->create(['proceso_transferencia_id' => $proceso->id]);
        $propia = Dependencia::factory()->hijaDe($raiz)->create();
        $ajena = Dependencia::factory()->hijaDe($raiz)->create();
        $encargado = Servidor::create(['dependencia_id' => $ajena->id, 'proceso_transferencia_id' => $proceso->id,
            'dni' => '12345678', 'nombres' => 'Responsable', 'apellidos' => 'Otra oficina', 'cargo' => 'Jefe']);
        $ajena->update(['encargado_servidor_id' => $encargado->id]);
        $otroProceso = ProcesoTransferencia::factory()->cerrado()->create();
        $anterior = Dependencia::factory()->create(['proceso_transferencia_id' => $otroProceso->id]);
        $usuario = User::factory()->create();
        AsignacionRol::factory()->rol(Rol::RESPONSABLE_CENTRO_COSTO)->create([
            'user_id' => $usuario->id, 'dependencia_id' => $propia->id, 'proceso_transferencia_id' => $proceso->id]);
        Sanctum::actingAs($usuario);

        $this->getJson('/api/auth/me')->assertOk()
            ->assertJsonPath('data.dependencias_ambito', [$propia->id]);

        $datos = collect($this->getJson('/api/dependencias/organigrama')->assertOk()->json('data'))->keyBy('id');
        $this->assertEqualsCanonicalizing([$raiz->id, $propia->id, $ajena->id], $datos->keys()->all());
        $this->assertTrue($datos[$propia->id]['es_responsable']);
        $this->assertTrue($datos[$propia->id]['en_ambito']);
        $this->assertFalse($datos[$ajena->id]['es_responsable']);
        $this->assertFalse($datos[$ajena->id]['en_ambito']);
        $this->assertNull($datos[$ajena->id]['encargado']);
        $this->assertArrayNotHasKey('servidores', $datos[$ajena->id]);
        $this->assertFalse($datos->has($anterior->id));
        $this->getJson('/api/dependencias/'.$ajena->id)->assertForbidden();
        $this->getJson('/api/acervo?dependencia_id='.$ajena->id)->assertForbidden();
        $catalogo = $this->getJson('/api/dependencias?all=true')->assertOk()->json('data');
        $this->assertCount(1, $catalogo);
        $this->assertArrayNotHasKey('servidores', $catalogo[0]);
    }

    public function test_administrador_puede_consultar_organigrama_sin_exponer_dni_ni_padron(): void
    {
        $this->seed(RolesPermisosSeeder::class);
        $proceso = ProcesoTransferencia::factory()->create();
        $dep = Dependencia::factory()->create(['proceso_transferencia_id' => $proceso->id]);
        $titular = Servidor::create(['dependencia_id' => $dep->id, 'proceso_transferencia_id' => $proceso->id,
            'dni' => '12345678', 'nombres' => 'Responsable', 'apellidos' => 'Institucional', 'cargo' => 'Jefe']);
        $dep->update(['encargado_servidor_id' => $titular->id]);
        $usuario = User::factory()->create();
        AsignacionRol::factory()->rol(Rol::ADMINISTRADOR)->create(['user_id' => $usuario->id,
            'dependencia_id' => null, 'proceso_transferencia_id' => $proceso->id]);
        Sanctum::actingAs($usuario);

        $datos = $this->getJson('/api/dependencias/organigrama')->assertOk()->json('data');
        $this->assertCount(1, $datos);
        $this->assertTrue($datos[0]['en_ambito']);
        $this->assertSame($titular->nombres, $datos[0]['encargado']['nombres']);
        $this->assertArrayNotHasKey('dni', $datos[0]['encargado']);
        $this->assertArrayNotHasKey('servidores', $datos[0]);
    }

    public function test_calcular_subarbol_no_hace_una_consulta_por_cada_nivel(): void
    {
        $proceso = ProcesoTransferencia::factory()->create();
        $raiz = Dependencia::factory()->create(['proceso_transferencia_id' => $proceso->id]);
        $padre = $raiz;
        $esperadas = [$raiz->id];
        for ($i = 0; $i < 8; $i++) {
            $padre = Dependencia::factory()->hijaDe($padre)->create();
            $esperadas[] = $padre->id;
        }
        DB::enableQueryLog();
        DB::flushQueryLog();
        $ids = $raiz->idsSubarbol();
        $consultas = count(DB::getQueryLog());
        DB::disableQueryLog();
        $this->assertSame($esperadas, $ids);
        $this->assertLessThanOrEqual(2, $consultas, 'El costo en consultas no debe crecer con la profundidad.');
    }
}

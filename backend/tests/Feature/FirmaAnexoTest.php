<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\FirmaAnexo;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\CaracterFirma;
use App\Support\Enums\EstadoFirma;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * B1 — Modelo de firmas por documento y versión (RF-004/005). El andamiaje de
 * datos debe registrar múltiples firmas sobre un mismo documento/versión sin
 * perder las previas, y distinguir carácter (obligatoria/opcional) y estado.
 * No integra proveedor de firma ni fija la matriz documental (D-02 pendiente).
 */
class FirmaAnexoTest extends TestCase
{
    use RefreshDatabase;

    private function documento(): Dependencia
    {
        $proceso = ProcesoTransferencia::factory()->create();

        return Dependencia::factory()->create(['proceso_transferencia_id' => $proceso->id]);
    }

    public function test_varias_firmas_coexisten_sobre_el_mismo_documento_y_version(): void
    {
        $doc = $this->documento();

        // Dos firmas obligatorias sobre la misma versión del mismo documento.
        FirmaAnexo::factory()->para($doc, version: 1)->caracter(CaracterFirma::OBLIGATORIA)->firmada()->create();
        FirmaAnexo::factory()->para($doc, version: 1)->caracter(CaracterFirma::OBLIGATORIA)->firmada()->create();

        $firmas = FirmaAnexo::where('firmable_type', $doc->getMorphClass())
            ->where('firmable_id', $doc->getKey())
            ->where('version', 1)
            ->get();

        // La segunda firma no sobrescribe la primera (RF-005).
        $this->assertCount(2, $firmas);
        $this->assertTrue($firmas->every(fn ($f) => $f->estado === EstadoFirma::FIRMADA));
    }

    public function test_distingue_firma_obligatoria_de_opcional_ausente(): void
    {
        $doc = $this->documento();

        FirmaAnexo::factory()->para($doc)->caracter(CaracterFirma::OBLIGATORIA)->firmada()->create();
        $ausente = FirmaAnexo::factory()->para($doc)->ausente()->create();

        // La ausencia de firma ETTE se registra como constancia, no como válida (C-08).
        $this->assertSame(CaracterFirma::OPCIONAL, $ausente->caracter);
        $this->assertSame(EstadoFirma::AUSENTE, $ausente->estado);
        $this->assertFalse($ausente->estado->esValida());
        $this->assertFalse($ausente->caracter->bloqueaEntrega());

        // Scopes: una firma obligatoria válida existe; la opcional ausente no cuenta.
        $this->assertSame(1, FirmaAnexo::obligatorias()->validas()->count());
    }

    public function test_una_firma_cancelada_no_cuenta_como_valida(): void
    {
        $doc = $this->documento();

        $cancelada = FirmaAnexo::factory()->para($doc)->create([
            'estado' => EstadoFirma::CANCELADA,
        ]);

        $this->assertFalse($cancelada->estado->esValida());
        $this->assertSame(0, FirmaAnexo::validas()->count());
    }

    public function test_casts_de_enums_y_json_de_verificacion(): void
    {
        $doc = $this->documento();

        $firma = FirmaAnexo::factory()->para($doc)->firmada()->create([
            'resultado_verificacion' => ['valida' => true, 'motor' => 'firmaperu'],
        ]);

        $fresca = $firma->fresh();
        $this->assertInstanceOf(CaracterFirma::class, $fresca->caracter);
        $this->assertInstanceOf(EstadoFirma::class, $fresca->estado);
        $this->assertSame(['valida' => true, 'motor' => 'firmaperu'], $fresca->resultado_verificacion);
        $this->assertNotNull($fresca->hash_pdf);
    }
}

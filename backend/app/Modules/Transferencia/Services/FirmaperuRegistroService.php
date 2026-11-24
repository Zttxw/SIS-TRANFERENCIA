<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Services;

use App\Models\User;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\ActaTransferencia;
use App\Modules\Transferencia\Models\DocumentoFirma;
use App\Modules\Transferencia\Models\FirmaAnexo;
use App\Modules\Transferencia\Models\FirmaSesion;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\EstadoFirma;
use Illuminate\Support\Facades\DB;

/**
 * Versiones de los documentos firmables y registro del hecho de firma.
 */
class FirmaperuRegistroService
{
    public function __construct(
        private readonly FirmaperuPdfService $pdf,
        private readonly FirmantesDocumento $firmantes,
        private readonly CadenaFirmas $cadena,
        private readonly SuscripcionEntrega $suscripcion,
    ) {}

    /**
     * Versión vigente del documento según la huella de sus datos. Serializa las
     * versiones de todos los anexos de la misma dependencia. Una nueva versión
     * del acta anula las firmas de ambos lados sobre la anterior. El Anexo 01
     * institucional (sin CC) se serializa por proceso.
     */
    public function documento(User $usuario, string $tipo, ?int $dependenciaId): DocumentoFirma
    {
        return DB::transaction(function () use ($usuario, $tipo, $dependenciaId): DocumentoFirma {
            $procesoId = $this->bloquear($dependenciaId);
            $huella = $this->pdf->huella($tipo, $dependenciaId, $usuario);
            $acta = $tipo === 'anexo07' ? ActaTransferencia::where('proceso_transferencia_id', $procesoId)
                ->where('dependencia_id', $dependenciaId)->lockForUpdate()->firstOrFail() : null;
            $anterior = DocumentoFirma::where('proceso_transferencia_id', $procesoId)
                ->where('dependencia_id', $dependenciaId)->where('tipo_documento', $tipo)->latest('version')->first();
            if ($anterior && hash_equals($anterior->contenido_sha256, $huella)
                && (! $acta || $anterior->version === $acta->version)) {
                return $anterior;
            }
            if ($acta && $anterior && $anterior->version >= $acta->version) {
                FirmaAnexo::where('firmable_type', $acta->getMorphClass())->where('firmable_id', $acta->id)
                    ->where('version', $acta->version)->update(['estado' => EstadoFirma::CANCELADA->value]);
                $acta->update(['version' => $acta->version + 1, 'estado' => 'generada', 'ruta_pdf_suscrito' => null]);
                $huella = $this->pdf->huella($tipo, $dependenciaId, $usuario);
            }

            return DocumentoFirma::create(['proceso_transferencia_id' => $procesoId,
                'dependencia_id' => $dependenciaId, 'tipo_documento' => $tipo,
                'version' => $acta?->version ?? (($anterior?->version ?? 0) + 1),
                'contenido_sha256' => $huella, 'acta_id' => $acta?->id]);
        });
    }

    /**
     * Una sesión firmada produce un único hecho de firma, con su lado y calidad.
     * Si es vigente, actualiza la suscripción del acta y de la entrega.
     */
    public function registrar(FirmaSesion $sesion): ?FirmaAnexo
    {
        if (! $sesion->documento_firma_id || $sesion->estado !== 'firmada') {
            return null;
        }

        return DB::transaction(function () use ($sesion): FirmaAnexo {
            $this->bloquear($sesion->dependencia_id);
            $dep = $sesion->dependencia_id ? Dependencia::findOrFail($sesion->dependencia_id) : null;
            $sesion = FirmaSesion::whereKey($sesion->id)->lockForUpdate()->firstOrFail();
            $documento = $sesion->documento;
            $usuario = User::findOrFail($sesion->usuario_id);
            abort_unless(hash_equals((string) $usuario->dni, $sesion->firmante_dni), 403,
                'El DNI del firmante cambió durante la sesión.');
            $operador = User::findOrFail($sesion->operador_id ?? $sesion->usuario_id);
            $firmante = $this->firmantes->firmante($operador, $sesion->tipo_documento, $dep?->id, $sesion->lado);
            abort_unless($firmante['firmante']->is($usuario) && $firmante['en_calidad_de'] === $sesion->en_calidad_de,
                403, 'El firmante designado cambió durante la sesión.');
            $acta = $documento->acta_id ? ActaTransferencia::findOrFail($documento->acta_id) : null;
            $vigente = $this->cadena->vigente($sesion);
            $firma = FirmaAnexo::firstOrCreate(['firma_sesion_id' => $sesion->id], [
                'proceso_transferencia_id' => $sesion->proceso_transferencia_id, 'dependencia_id' => $dep?->id,
                'firmable_type' => $acta?->getMorphClass() ?? $documento->getMorphClass(),
                'firmable_id' => $acta?->id ?? $documento->id, 'version' => $documento->version,
                'firmante_id' => $usuario->id, 'firmante_nombre' => $usuario->name,
                'lado' => $firmante['lado'], 'en_calidad_de' => $firmante['en_calidad_de'],
                'motivo_suplencia' => $firmante['motivo_suplencia'],
                'estado' => $vigente ? EstadoFirma::FIRMADA : EstadoFirma::CANCELADA,
                'firmada_en' => $sesion->firmado_en, 'hash_pdf' => $sesion->firmado_sha256,
                'resultado_verificacion' => array_merge($sesion->detalles ?? [], ['documento_firma_id' => $documento->id,
                    'contenido_sha256' => $documento->contenido_sha256, 'vigente_al_registrar' => $vigente]),
            ]);
            if ($dep !== null && $vigente && $firma->wasRecentlyCreated) {
                $this->suscripcion->sincronizar($dep, $usuario);
            }

            return $firma;
        });
    }

    /**
     * Bloquea el CC (o el proceso, para el documento institucional) y devuelve
     * el proceso al que pertenece.
     */
    private function bloquear(?int $dependenciaId): int
    {
        if ($dependenciaId === null) {
            return ProcesoTransferencia::where('estado', 'abierto')->lockForUpdate()->firstOrFail()->id;
        }

        return Dependencia::whereKey($dependenciaId)->lockForUpdate()->firstOrFail()->proceso_transferencia_id;
    }
}

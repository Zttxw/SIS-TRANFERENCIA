<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Services;

use App\Models\User;
use App\Modules\Transferencia\Models\ActaTransferencia;
use App\Modules\Transferencia\Models\DocumentoFirma;
use App\Modules\Transferencia\Models\FirmaAnexo;
use App\Modules\Transferencia\Models\FirmaBorrador;
use App\Modules\Transferencia\Models\FirmaSesion;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\EstadoFirma;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;

/**
 * Vigencia de las firmas y cadena de PDF firmados de un documento (D-06).
 *
 * Una cadena parte del PDF generado vigente: su primer eslabón firma ese PDF
 * (digital, o el escaneo con firma manuscrita del lado ETTE) y cada eslabón
 * siguiente firma el PDF del anterior (`documento_previo_id`). El documento
 * queda suscrito cuando una misma cadena reúne una firma vigente de cada lado.
 */
class CadenaFirmas
{
    public function __construct(
        private readonly FirmaperuPdfService $pdf,
        private readonly FirmantesDocumento $firmantes,
    ) {}

    /**
     * Estado de firma de un documento: la mejor cadena vigente y quién firmó
     * por cada lado.
     *
     * @return array{completo: bool, sesion_final_id: ?string, firmado_path: ?string, hay_firma_digital: bool,
     *     entidad: ?array<string, mixed>, ette: ?array<string, mixed>}
     */
    public function estado(int $procesoId, ?int $dependenciaId, string $tipo, User $usuario): array
    {
        $resultado = ['completo' => false, 'sesion_final_id' => null, 'firmado_path' => null,
            'hay_firma_digital' => false, 'entidad' => null, 'ette' => null];
        $generado = $this->generado($procesoId, $dependenciaId, $tipo);
        if (! $this->pdf->generadoVigente($generado, $tipo, $dependenciaId, $usuario)) {
            return $resultado;
        }

        $firmas = FirmaAnexo::with(['sesion', 'firmante'])->validas()
            ->where('proceso_transferencia_id', $procesoId)->where('dependencia_id', $dependenciaId)
            ->whereHas('sesion', fn ($q) => $q->where('tipo_documento', $tipo)->where('estado', 'firmada'))
            ->get()->keyBy('firma_sesion_id');

        $mejor = null;
        foreach ($firmas as $firma) {
            $sesion = $firma->sesion;
            if (! $this->vigenteContra($sesion, $generado) || ! $this->archivoIntegro($sesion)) {
                continue;
            }
            $resultado['hay_firma_digital'] = $resultado['hay_firma_digital'] || $sesion->origen !== 'manual';
            $lados = $this->ladosDeLaCadena($sesion, $firmas, $dependenciaId);
            $puntaje = count(array_filter($lados));
            if ($mejor === null || $puntaje > $mejor['puntaje']
                || ($puntaje === $mejor['puntaje'] && $sesion->firmado_en > $mejor['sesion']->firmado_en)) {
                $mejor = ['puntaje' => $puntaje, 'sesion' => $sesion, 'lados' => $lados];
            }
        }

        if ($mejor !== null) {
            $resultado = array_merge($resultado, $mejor['lados'], [
                'completo' => $mejor['puntaje'] === 2,
                'sesion_final_id' => $mejor['sesion']->id,
                'firmado_path' => $mejor['sesion']->firmado_path,
            ]);
        }

        return $resultado;
    }

    /** ¿Existe ya una firma digital vigente sobre la versión actual del documento? */
    public function hayFirmaDigitalVigente(DocumentoFirma $documento): bool
    {
        $generado = $this->generado($documento->proceso_transferencia_id, $documento->dependencia_id, $documento->tipo_documento);

        return $generado !== null && FirmaSesion::where('documento_firma_id', $documento->id)
            ->where('estado', 'firmada')->where('origen', '!=', 'manual')->get()
            ->contains(fn (FirmaSesion $sesion): bool => $this->vigenteContra($sesion, $generado));
    }

    /** La firma sigue vigente: misma versión de datos, proceso abierto y cadena desde el PDF generado actual. */
    public function vigente(FirmaSesion $sesion): bool
    {
        $usuario = User::find($sesion->usuario_id);
        $generado = $this->generado($sesion->proceso_transferencia_id, $sesion->dependencia_id, $sesion->tipo_documento);

        return $usuario !== null && $generado !== null && $this->vigenteContra($sesion, $generado)
            && hash_equals($sesion->documento->contenido_sha256, $this->pdf->huella($sesion->tipo_documento, $sesion->dependencia_id, $usuario));
    }

    /** ¿La cadena de la sesión parte del PDF generado indicado? */
    public function provieneDelGenerado(FirmaSesion $sesion, ?FirmaBorrador $generado): bool
    {
        if ($generado === null) {
            return false;
        }
        $base = $this->eslabones($sesion)?->last();

        return $base !== null && hash_equals($generado->pdf_sha256, $base->original_sha256);
    }

    public function generado(int $procesoId, ?int $dependenciaId, string $tipo): ?FirmaBorrador
    {
        return FirmaBorrador::where('proceso_transferencia_id', $procesoId)
            ->where('dependencia_id', $dependenciaId)->where('tipo_documento', $tipo)->first();
    }

    /**
     * Comprobaciones de vigencia salvo la huella de los datos actuales: quien
     * llama ya sabe que el PDF generado está vigente, así que basta con que la
     * versión firmada tenga el mismo contenido que ese PDF.
     */
    private function vigenteContra(FirmaSesion $sesion, FirmaBorrador $generado): bool
    {
        $documento = $sesion->documento;
        if (! $documento || ! User::whereKey($sesion->usuario_id)->where('activo', true)->exists()
            || ! str_starts_with($generado->pdf_path, 'firmaperu/generados/')
            || ! ProcesoTransferencia::whereKey($sesion->proceso_transferencia_id)->where('estado', 'abierto')->exists()
            || FirmaAnexo::where('firma_sesion_id', $sesion->id)->where('estado', EstadoFirma::CANCELADA->value)->exists()) {
            return false;
        }
        $ultima = (int) DocumentoFirma::where('proceso_transferencia_id', $sesion->proceso_transferencia_id)
            ->where('dependencia_id', $sesion->dependencia_id)->where('tipo_documento', $sesion->tipo_documento)->max('version');
        if ($documento->version !== $ultima
            || ($documento->acta_id && ActaTransferencia::find($documento->acta_id)?->version !== $documento->version)) {
            return false;
        }

        return $generado->contenido_sha256 !== null && hash_equals($documento->contenido_sha256, $generado->contenido_sha256)
            && $this->provieneDelGenerado($sesion, $generado);
    }

    /**
     * Firma que aporta cada lado en la cadena que termina en la sesión.
     *
     * @param  Collection<string, FirmaAnexo>  $firmas  firmas válidas por sesión
     * @return array{entidad: ?array<string, mixed>, ette: ?array<string, mixed>}
     */
    private function ladosDeLaCadena(FirmaSesion $final, Collection $firmas, ?int $dependenciaId): array
    {
        $lados = ['entidad' => null, 'ette' => null];
        foreach ($this->eslabones($final) ?? [] as $eslabon) {
            $firma = $firmas->get($eslabon->id);
            if ($firma && $lados[$firma->lado->value] === null && $this->firmantes->firmaCuenta($firma, $dependenciaId)) {
                $lados[$firma->lado->value] = $this->resumen($firma, $eslabon);
            }
        }

        return $lados;
    }

    /**
     * Sesiones de la cadena, de la final a la base; null si está rota (un
     * eslabón falta, no está firmado, es de otra versión o hay un ciclo).
     *
     * @return Collection<int, FirmaSesion>|null
     */
    private function eslabones(FirmaSesion $sesion): ?Collection
    {
        $cadena = collect([$sesion]);
        while ($sesion->documento_previo_id) {
            if ($cadena->contains('id', $sesion->documento_previo_id)) {
                return null;
            }
            $sesion = FirmaSesion::whereKey($sesion->documento_previo_id)
                ->where('documento_firma_id', $sesion->documento_firma_id)->where('estado', 'firmada')->first();
            if (! $sesion) {
                return null;
            }
            $cadena->push($sesion);
        }

        return $cadena;
    }

    private function archivoIntegro(FirmaSesion $sesion): bool
    {
        return $sesion->firmado_path !== null && Storage::disk('local')->exists($sesion->firmado_path)
            && hash_equals((string) $sesion->firmado_sha256, hash('sha256', Storage::disk('local')->get($sesion->firmado_path)));
    }

    /** @return array<string, mixed> */
    private function resumen(FirmaAnexo $firma, FirmaSesion $sesion): array
    {
        return [
            'sesion_id' => $sesion->id,
            'firmante' => $firma->firmante_nombre,
            'en_calidad_de' => $firma->en_calidad_de?->value,
            'motivo_suplencia' => $firma->motivo_suplencia,
            'origen' => $sesion->origen === 'manual' ? 'manuscrita' : 'digital',
            'firmado_en' => $sesion->firmado_en?->toIso8601String(),
        ];
    }
}

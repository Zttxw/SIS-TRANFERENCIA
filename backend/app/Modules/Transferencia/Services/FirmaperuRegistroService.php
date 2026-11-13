<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Services;

use App\Models\User;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\ActaTransferencia;
use App\Modules\Transferencia\Models\DocumentoFirma;
use App\Modules\Transferencia\Models\FirmaAnexo;
use App\Modules\Transferencia\Models\FirmaBorrador;
use App\Modules\Transferencia\Models\FirmaSesion;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\CaracterFirma;
use App\Support\Enums\EstadoFirma;
use App\Support\Enums\Permiso;
use App\Support\Enums\Rol;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class FirmaperuRegistroService
{
    public function __construct(private readonly FirmaperuPdfService $pdf) {}

    /** @return array{puede_remitir: bool, firmados: int, pendientes: list<string>} */
    public function requisitosRemision(int $dependenciaId, User $usuario): array
    {
        $procesoId = Dependencia::findOrFail($dependenciaId)->proceso_transferencia_id;
        $pendientes = [];
        foreach (['anexo02', 'anexo03', 'anexo04', 'anexo05', 'anexo06', 'anexo07'] as $tipo) {
            $generado = FirmaBorrador::where('proceso_transferencia_id', $procesoId)
                ->where('dependencia_id', $dependenciaId)->where('tipo_documento', $tipo)->first();
            $firmado = false;
            if ($this->pdf->generadoVigente($generado, $tipo, $dependenciaId, $usuario)) {
                $firmas = FirmaAnexo::where('proceso_transferencia_id', $procesoId)
                    ->where('dependencia_id', $dependenciaId)->obligatorias()->validas()
                    ->whereHas('sesion', fn ($q) => $q->where('tipo_documento', $tipo)->where('estado', 'firmada'))
                    ->whereHas('firmante', fn ($q) => $q->where('activo', true)->whereHas('asignacionesRol', fn ($roles) => $roles
                        ->where('rol', Rol::RESPONSABLE_CENTRO_COSTO->value)
                        ->where('proceso_transferencia_id', $procesoId)->where('dependencia_id', $dependenciaId)))
                    ->with('sesion')->get();
                $firmado = $firmas->contains(fn (FirmaAnexo $firma): bool => $this->vigente($firma->sesion)
                    && $this->provieneDelGenerado($firma->sesion, $generado)
                    && Storage::disk('local')->exists($firma->sesion->firmado_path)
                    && hash_equals($firma->sesion->firmado_sha256, hash('sha256', Storage::disk('local')->get($firma->sesion->firmado_path))));
            }
            if (! $firmado) {
                $pendientes[] = $tipo;
            }
        }

        return ['puede_remitir' => $pendientes === [], 'firmados' => 6 - count($pendientes), 'pendientes' => $pendientes];
    }

    public function provieneDelGenerado(FirmaSesion $sesion, ?FirmaBorrador $generado): bool
    {
        if (! $generado) {
            return false;
        }
        $visitadas = [];
        while ($sesion->documento_previo_id) {
            if (isset($visitadas[$sesion->id])) {
                return false;
            }
            $visitadas[$sesion->id] = true;
            $previa = FirmaSesion::whereKey($sesion->documento_previo_id)
                ->where('documento_firma_id', $sesion->documento_firma_id)->where('estado', 'firmada')->first();
            if (! $previa) {
                return false;
            }
            $sesion = $previa;
        }

        return hash_equals($generado->pdf_sha256, $sesion->original_sha256);
    }

    public function caracter(User $usuario, string $tipo, int $dependenciaId): CaracterFirma
    {
        abort_unless($usuario->activo && $usuario->puedeAccederDependencia($dependenciaId), 403);
        $dep = Dependencia::findOrFail($dependenciaId);
        $asignaciones = $usuario->asignacionesRol()->with('dependencia')
            ->where('proceso_transferencia_id', $dep->proceso_transferencia_id)->get();
        $personal = $asignaciones->contains(function ($asignacion) use ($dependenciaId): bool {
            if ($asignacion->rol === Rol::ETTS) {
                return true;
            }
            if (! in_array($asignacion->rol, [Rol::SERVIDOR, Rol::RESPONSABLE_EQUIPO, Rol::RESPONSABLE_CENTRO_COSTO], true)) {
                return false;
            }

            return $asignacion->dependencia_id === $dependenciaId
                || ($asignacion->rol !== Rol::SERVIDOR && in_array($dependenciaId, $asignacion->dependencia?->idsSubarbol() ?? [], true));
        });
        if ($personal && ($usuario->tienePermiso(Permiso::RegistrarAnexos)
            || $usuario->tienePermiso(Permiso::FirmarAnexos) || $usuario->tienePermiso(Permiso::GenerarActas))) {
            abort_if($tipo === 'anexo07' && ! $usuario->tienePermiso(Permiso::GenerarActas), 403, 'No tiene permiso para suscribir el acta.');

            return CaracterFirma::OBLIGATORIA;
        }
        abort_unless($tipo !== 'anexo01' && $usuario->tienePermiso(Permiso::FirmarAnexos)
            && $asignaciones->contains(fn ($a): bool => $a->rol === Rol::DELEGADO_ETTE && $a->dependencia_id === $dependenciaId), 403);
        abort_if($tipo === 'anexo07' && ! ActaTransferencia::where('proceso_transferencia_id', $dep->proceso_transferencia_id)
            ->where('dependencia_id', $dependenciaId)->exists(), 409, 'El responsable debe emitir el acta antes de la firma opcional.');

        return CaracterFirma::OPCIONAL;
    }

    /** Serializa las versiones de todos los anexos de la misma dependencia. */
    public function documento(User $usuario, string $tipo, int $dependenciaId): DocumentoFirma
    {
        return DB::transaction(function () use ($usuario, $tipo, $dependenciaId): DocumentoFirma {
            $dep = Dependencia::whereKey($dependenciaId)->lockForUpdate()->firstOrFail();
            $huella = $this->pdf->huella($tipo, $dependenciaId, $usuario);
            $acta = $tipo === 'anexo07' ? ActaTransferencia::where('proceso_transferencia_id', $dep->proceso_transferencia_id)
                ->where('dependencia_id', $dependenciaId)->lockForUpdate()->firstOrFail() : null;
            $anterior = DocumentoFirma::where('proceso_transferencia_id', $dep->proceso_transferencia_id)
                ->where('dependencia_id', $dependenciaId)->where('tipo_documento', $tipo)->latest('version')->first();
            if ($anterior && hash_equals($anterior->contenido_sha256, $huella)
                && (! $acta || $anterior->version === $acta->version)) {
                return $anterior;
            }
            if ($acta && $anterior && $anterior->version >= $acta->version) {
                FirmaAnexo::where('firmable_type', $acta->getMorphClass())->where('firmable_id', $acta->id)
                    ->where('version', $acta->version)->obligatorias()->update(['estado' => EstadoFirma::CANCELADA->value]);
                $acta->update(['version' => $acta->version + 1, 'estado' => 'generada', 'ruta_pdf_suscrito' => null]);
                $huella = $this->pdf->huella($tipo, $dependenciaId, $usuario);
            }

            return DocumentoFirma::create(['proceso_transferencia_id' => $dep->proceso_transferencia_id,
                'dependencia_id' => $dependenciaId, 'tipo_documento' => $tipo,
                'version' => $acta?->version ?? (($anterior?->version ?? 0) + 1),
                'contenido_sha256' => $huella, 'acta_id' => $acta?->id]);
        });
    }

    public function vigente(FirmaSesion $sesion): bool
    {
        $documento = $sesion->documento;
        $usuario = User::find($sesion->usuario_id);
        if (! $documento || ! $usuario || ! $usuario->activo) {
            return false;
        }
        if (! ProcesoTransferencia::whereKey($sesion->proceso_transferencia_id)->where('estado', 'abierto')->exists()) {
            return false;
        }
        if (FirmaAnexo::where('firma_sesion_id', $sesion->id)->where('estado', EstadoFirma::CANCELADA->value)->exists()) {
            return false;
        }
        $ultimo = DocumentoFirma::where('proceso_transferencia_id', $sesion->proceso_transferencia_id)
            ->where('dependencia_id', $sesion->dependencia_id)->where('tipo_documento', $sesion->tipo_documento)->max('version');
        if ($documento->version !== (int) $ultimo) {
            return false;
        }
        if ($documento->acta_id && ActaTransferencia::find($documento->acta_id)?->version !== $documento->version) {
            return false;
        }

        $generado = FirmaBorrador::where('proceso_transferencia_id', $sesion->proceso_transferencia_id)
            ->where('dependencia_id', $sesion->dependencia_id)->where('tipo_documento', $sesion->tipo_documento)->first();

        return $generado !== null && str_starts_with($generado->pdf_path, 'firmaperu/generados/')
            && $this->provieneDelGenerado($sesion, $generado)
            && hash_equals($documento->contenido_sha256, $this->pdf->huella($sesion->tipo_documento, $sesion->dependencia_id, $usuario));
    }

    /** Una sesión verificada produce un único hecho de firma; no se infieren firmantes de PDFs antiguos. */
    public function registrar(FirmaSesion $sesion): ?FirmaAnexo
    {
        if (! $sesion->documento_firma_id || $sesion->estado !== 'firmada') {
            return null;
        }

        return DB::transaction(function () use ($sesion): FirmaAnexo {
            $dep = Dependencia::whereKey($sesion->dependencia_id)->lockForUpdate()->firstOrFail();
            $sesion = FirmaSesion::whereKey($sesion->id)->lockForUpdate()->firstOrFail();
            $documento = $sesion->documento;
            $usuario = User::findOrFail($sesion->usuario_id);
            abort_unless(hash_equals((string) $usuario->dni, $sesion->firmante_dni), 403,
                'El DNI de la cuenta cambió durante la sesión.');
            $caracter = $this->caracter($usuario, $sesion->tipo_documento, $dep->id);
            abort_unless($caracter->value === $sesion->caracter, 403, 'La responsabilidad del firmante cambió durante la sesión.');
            $acta = $documento->acta_id ? ActaTransferencia::findOrFail($documento->acta_id) : null;
            $vigente = $this->vigente($sesion);
            $firma = FirmaAnexo::firstOrCreate(['firma_sesion_id' => $sesion->id], [
                'proceso_transferencia_id' => $sesion->proceso_transferencia_id, 'dependencia_id' => $dep->id,
                'firmable_type' => $acta?->getMorphClass() ?? $documento->getMorphClass(),
                'firmable_id' => $acta?->id ?? $documento->id, 'version' => $documento->version,
                'firmante_id' => $usuario->id, 'firmante_nombre' => $usuario->name,
                'caracter' => $caracter, 'estado' => $vigente ? EstadoFirma::FIRMADA : EstadoFirma::CANCELADA,
                'firmada_en' => $sesion->firmado_en, 'hash_pdf' => $sesion->firmado_sha256,
                'resultado_verificacion' => array_merge($sesion->detalles ?? [], ['documento_firma_id' => $documento->id,
                    'contenido_sha256' => $documento->contenido_sha256, 'vigente_al_registrar' => $vigente]),
            ]);
            if ($acta && $vigente && $firma->estado === EstadoFirma::FIRMADA && $caracter === CaracterFirma::OBLIGATORIA
                && $usuario->tieneRol(Rol::RESPONSABLE_CENTRO_COSTO, $dep->id)) {
                $acta->update(['estado' => 'suscrita', 'ruta_pdf_suscrito' => $sesion->firmado_path]);
            }

            return $firma;
        });
    }
}

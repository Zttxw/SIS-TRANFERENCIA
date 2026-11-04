<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Services;

use App\Models\User;
use App\Modules\Acervo\Models\AcervoDocumental;
use App\Modules\Gestion\Models\InformeGestion;
use App\Modules\NoPatrimonial\Models\BienNoPatrimonial;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Patrimonio\Models\BienPatrimonial;
use App\Modules\Personal\Models\Personal;
use App\Modules\Transferencia\Models\ActaTransferencia;
use App\Modules\Transferencia\Models\Entrega;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\EstadoEntrega;
use App\Support\Enums\EstadoVerificacionBien;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class TransferenciaService
{
    /**
     * Resumen del estado global de entrega de los anexos para una dependencia.
     */
    public function obtenerEstadoEntrega(int $dependenciaId, ?int $procesoId = null): array
    {
        $procesoId = $procesoId ?? $this->resolverProcesoActivoId();
        $dep = Dependencia::findOrFail($dependenciaId);

        // Estado Anexo 02 (Gestión)
        $informe = InformeGestion::where('dependencia_id', $dependenciaId)
            ->where('proceso_transferencia_id', $procesoId)
            ->first();

        // Estado Anexo 03 (Acervo)
        $totalAcervo = AcervoDocumental::where('dependencia_id', $dependenciaId)
            ->where('proceso_transferencia_id', $procesoId)
            ->count();

        // Estado Anexo 04 (Patrimonio)
        $totalBienes = BienPatrimonial::where('dependencia_id', $dependenciaId)
            ->where('proceso_transferencia_id', $procesoId)
            ->count();
        $bienesVerificados = BienPatrimonial::where('dependencia_id', $dependenciaId)
            ->where('proceso_transferencia_id', $procesoId)
            ->whereHas('verificacion', fn ($q) => $q->where('estado', EstadoVerificacionBien::CONFIRMADO->value))
            ->count();
        $bienesPendientes = BienPatrimonial::where('dependencia_id', $dependenciaId)
            ->where('proceso_transferencia_id', $procesoId)
            ->whereHas('verificacion', fn ($q) => $q->where('estado', EstadoVerificacionBien::PENDIENTE->value))
            ->count();

        // Estado Anexo 05 (Personal)
        $totalPersonal = Personal::where('dependencia_id', $dependenciaId)
            ->where('proceso_transferencia_id', $procesoId)
            ->count();

        // Estado Anexo 06 (No Patrimonial)
        $totalNoPatrimonial = BienNoPatrimonial::where('dependencia_id', $dependenciaId)
            ->where('proceso_transferencia_id', $procesoId)
            ->count();

        // Entrega jerárquica
        $entrega = Entrega::with(['emisor', 'receptor', 'dependenciaDestino'])
            ->where('dependencia_id', $dependenciaId)
            ->where('proceso_transferencia_id', $procesoId)
            ->latest()
            ->first();

        return [
            'dependencia' => [
                'id' => $dep->id,
                'codigo' => $dep->codigo,
                'nombre' => $dep->nombre,
                'nivel' => $dep->nivel,
                'parent_id' => $dep->parent_id,
            ],
            'anexo02_gestion' => [
                'existe' => $informe !== null,
                'estado' => $informe?->estado ?? 'pendiente',
            ],
            'anexo03_acervo' => [
                'total_series' => $totalAcervo,
            ],
            'anexo04_patrimonio' => [
                'total_bienes' => $totalBienes,
                'confirmados' => $bienesVerificados,
                'pendientes' => $bienesPendientes,
                'porcentaje_avance' => $totalBienes > 0 ? round(($bienesVerificados / $totalBienes) * 100, 1) : 100.0,
            ],
            'anexo05_personal' => [
                'total_personal' => $totalPersonal,
            ],
            'anexo06_nopatrimonial' => [
                'total_bienes' => $totalNoPatrimonial,
            ],
            'entrega' => $entrega ? [
                'id' => $entrega->id,
                'estado' => $entrega->estado->value,
                'remitida_en' => $entrega->remitida_en?->toIso8601String(),
                'revisada_en' => $entrega->revisada_en?->toIso8601String(),
                'comentario' => $entrega->comentario,
            ] : null,
        ];
    }

    /**
     * Remite la entrega de la dependencia al superior jerárquico (plan §7.8, Etapas 2-4).
     */
    public function remitirEntrega(int $dependenciaId, User $usuario, ?string $comentario = null): Entrega
    {
        $procesoId = $this->resolverProcesoActivoId();
        $dep = Dependencia::findOrFail($dependenciaId);

        return DB::transaction(function () use ($dep, $procesoId, $usuario, $comentario) {
            return Entrega::updateOrCreate(
                [
                    'proceso_transferencia_id' => $procesoId,
                    'dependencia_id' => $dep->id,
                ],
                [
                    'dependencia_destino_id' => $dep->parent_id,
                    'emisor_id' => $usuario->id,
                    'estado' => EstadoEntrega::REMITIDA,
                    'remitida_en' => Carbon::now(),
                    'comentario' => $comentario,
                ]
            );
        });
    }

    /**
     * Genera o consulta el Acta oficial de Transferencia (Anexo 07).
     */
    public function obtenerActa(int $dependenciaId): ActaTransferencia
    {
        $procesoId = $this->resolverProcesoActivoId();
        $dep = Dependencia::findOrFail($dependenciaId);

        return ActaTransferencia::firstOrCreate(
            [
                'proceso_transferencia_id' => $procesoId,
                'dependencia_id' => $dep->id,
            ],
            [
                'codigo' => 'ACTA-'.Carbon::now()->year.'-'.str_replace('.', '', $dep->codigo),
                'lugar' => 'San Jerónimo, Cusco',
                'fecha_hora' => Carbon::now(),
                'intervinientes' => [
                    'titular_saliente' => null,
                    'titular_entrante' => null,
                ],
                'anexos_entregados' => [
                    'anexo_01' => true,
                    'anexo_02' => true,
                    'anexo_03' => true,
                    'anexo_04' => true,
                    'anexo_05' => true,
                    'anexo_06' => true,
                    'anexo_07' => true,
                ],
                'estado' => 'borrador',
            ]
        );
    }

    private function resolverProcesoActivoId(): int
    {
        return (int) (ProcesoTransferencia::where('estado', 'abierto')->value('id') ?? 1);
    }
}

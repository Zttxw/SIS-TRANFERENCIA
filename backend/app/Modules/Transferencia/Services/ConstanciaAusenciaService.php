<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Services;

use App\Models\User;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\ActaTransferencia;
use App\Modules\Transferencia\Models\FirmaAnexo;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\CaracterFirma;
use App\Support\Enums\EstadoFirma;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Carbon;

/**
 * Constancia de ausencia de firma ETTE + copia digital (B2, C-08, D-12).
 *
 * El responsable del centro de costo registra que el ETTE no firmó una versión
 * del documento y marca la entrega de la copia digital, de forma trazable y
 * SIN presumir acuse (doc 05 §4). Se modela reutilizando `firmas_anexo` con
 * estado `ausente` (carácter opcional): no crea una firma válida ni una
 * conformidad, y no bloquea la remisión/consolidación (el gate B3b solo mira
 * firmas obligatorias).
 *
 * La identidad concreta del integrante ETTE ausente puede anotarse (nombre), pero
 * no se presupone la matriz ETTS ni un orden de firmas (D-02).
 */
class ConstanciaAusenciaService
{
    /**
     * Registra (idempotente por documento+versión) la ausencia de firma ETTE
     * sobre el acta de la dependencia y marca la copia digital como entregada.
     *
     * @param  array{ette_nombre?: ?string, nota?: ?string}  $datos
     */
    public function registrar(int $dependenciaId, User $responsable, array $datos = [], ?int $procesoId = null): FirmaAnexo
    {
        $procesoId = $procesoId ?? $this->resolverProcesoActivoId();
        $dep = Dependencia::findOrFail($dependenciaId);

        // El documento sobre el que se deja constancia es el acta vigente de la
        // dependencia (Anexo 07). Se materializa si aún no existe.
        $acta = ActaTransferencia::firstOrCreate(
            [
                'proceso_transferencia_id' => $procesoId,
                'dependencia_id' => $dep->id,
            ],
            [
                'numero_acta' => 'ACTA-'.Carbon::now()->year.'-'.str_replace('.', '', (string) $dep->codigo),
                'fecha_acta' => Carbon::now()->toDateString(),
                'estado' => 'generada',
            ]
        );

        $version = $acta->version ?? 1;
        $nota = $datos['nota'] ?? 'El integrante ETTE no firmó esta versión; se entrega copia digital.';

        // Idempotente: una sola constancia de ausencia por acta+versión. Si ya
        // existe, se actualiza la marca de copia (re-registro del acto) sin
        // duplicar la constancia.
        $constancia = FirmaAnexo::query()
            ->where('firmable_type', $acta->getMorphClass())
            ->where('firmable_id', $acta->id)
            ->where('version', $version)
            ->ausentesEtte()
            ->first();

        $atributos = [
            'proceso_transferencia_id' => $procesoId,
            'dependencia_id' => $dep->id,
            'firmable_type' => $acta->getMorphClass(),
            'firmable_id' => $acta->id,
            'version' => $version,
            'firmante_nombre' => $datos['ette_nombre'] ?? null,
            'caracter' => CaracterFirma::OPCIONAL,
            'estado' => EstadoFirma::AUSENTE,
            'nota' => $nota,
            'copia_entregada_en' => Carbon::now(),
            'copia_registrada_por_id' => $responsable->id,
        ];

        if ($constancia === null) {
            $constancia = FirmaAnexo::create($atributos);
        } else {
            $constancia->fill($atributos)->save();
        }

        return $constancia->fresh(['copiaRegistradaPor']);
    }

    /**
     * Lista las constancias de ausencia ETTE de una dependencia (consulta).
     *
     * @return Collection<int, FirmaAnexo>
     */
    public function listar(int $dependenciaId, ?int $procesoId = null): Collection
    {
        $procesoId = $procesoId ?? $this->resolverProcesoActivoId();

        return FirmaAnexo::query()
            ->with(['copiaRegistradaPor:id,dni,name'])
            ->where('proceso_transferencia_id', $procesoId)
            ->where('dependencia_id', $dependenciaId)
            ->ausentesEtte()
            ->orderByDesc('id')
            ->get();
    }

    private function resolverProcesoActivoId(): int
    {
        return (int) (ProcesoTransferencia::where('estado', 'abierto')->value('id') ?? 1);
    }
}

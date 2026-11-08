<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Services;

use App\Models\User;
use App\Modules\Acervo\Models\AcervoDocumental;
use App\Modules\Documentos\Models\DocumentoPendiente;
use App\Modules\Gestion\Models\InformeGestion;
use App\Modules\NoPatrimonial\Models\BienNoPatrimonial;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Patrimonio\Models\BienPatrimonial;
use App\Modules\Personal\Models\Personal;
use App\Modules\Transferencia\Models\ActaTransferencia;
use App\Modules\Transferencia\Models\Entrega;
use App\Modules\Transferencia\Models\Observacion;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\EstadoEntrega;
use App\Support\Enums\EstadoObservacion;
use App\Support\Enums\EstadoVerificacionBien;
use App\Support\Http\ApiResponse;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class TransferenciaService
{
    /**
     * Lista entregas acotadas al ámbito institucional (filtros: dependencia_id, estado, dependencia_ids).
     *
     * @param  array<string, mixed>  $filtros
     */
    public function listarEntregas(array $filtros = []): LengthAwarePaginator
    {
        $procesoId = $this->resolverProcesoActivoId();

        $query = Entrega::query()
            ->with(['dependencia', 'dependenciaDestino', 'emisor', 'receptor'])
            ->where('proceso_transferencia_id', $procesoId)
            ->orderByDesc('id');

        if (! empty($filtros['estado'])) {
            $query->where('estado', (string) $filtros['estado']);
        }

        if (! empty($filtros['dependencia_id'])) {
            $query->where('dependencia_id', (int) $filtros['dependencia_id']);
        } elseif (! empty($filtros['dependencia_ids'])) {
            $query->whereIn('dependencia_id', $filtros['dependencia_ids']);
        }

        $perPage = min((int) ($filtros['per_page'] ?? 25), 100);

        return $query->paginate($perPage);
    }

    /**
     * Tablero operativo global de transferencia para monitoreo gerencial y toma de decisiones.
     *
     * @param  list<int>|null  $dependenciaIds
     * @return array<string, mixed>
     */
    public function obtenerTableroOperativo(?array $dependenciaIds = null, ?int $procesoId = null): array
    {
        $procesoId = $procesoId ?? $this->resolverProcesoActivoId();

        $query = Dependencia::query()
            ->with(['encargado'])
            ->where('proceso_transferencia_id', $procesoId);

        if ($dependenciaIds !== null) {
            $query->whereIn('id', $dependenciaIds);
        }

        $dependencias = $query->orderBy('codigo')->get();
        $ids = $dependencias->pluck('id')->all();

        // Entregas más recientes por dependencia
        $entregas = Entrega::query()
            ->where('proceso_transferencia_id', $procesoId)
            ->whereIn('dependencia_id', $ids)
            ->latest('id')
            ->get()
            ->unique('dependencia_id')
            ->keyBy('dependencia_id');

        // Observaciones abiertas por dependencia
        $observacionesAbiertas = [];
        $observacionesList = Observacion::query()
            ->where('proceso_transferencia_id', $procesoId)
            ->where('estado', EstadoObservacion::ABIERTA->value)
            ->get(['id', 'observable_type', 'observable_id']);

        foreach ($observacionesList as $obs) {
            $modelo = $obs->observable_type;
            if (class_exists($modelo)) {
                $depId = $modelo::where('id', $obs->observable_id)->value('dependencia_id');
                if ($depId) {
                    $observacionesAbiertas[$depId] = ($observacionesAbiertas[$depId] ?? 0) + 1;
                }
            }
        }

        // Bienes patrimoniales asignados
        $bienesTotals = BienPatrimonial::query()
            ->where('proceso_transferencia_id', $procesoId)
            ->whereIn('dependencia_id', $ids)
            ->selectRaw('dependencia_id, count(*) as total')
            ->groupBy('dependencia_id')
            ->pluck('total', 'dependencia_id');

        // Bienes patrimoniales confirmados
        $bienesConfirmados = BienPatrimonial::query()
            ->where('proceso_transferencia_id', $procesoId)
            ->whereIn('dependencia_id', $ids)
            ->whereHas('verificacion', fn ($q) => $q->where('estado', EstadoVerificacionBien::CONFIRMADO->value))
            ->selectRaw('dependencia_id, count(*) as total')
            ->groupBy('dependencia_id')
            ->pluck('total', 'dependencia_id');

        $total = $dependencias->count();
        $consolidadas = 0;
        $remitidas = 0;
        $observadas = 0;
        $borrador = 0;

        $items = $dependencias->map(function ($dep) use ($entregas, $observacionesAbiertas, $bienesTotals, $bienesConfirmados, &$consolidadas, &$remitidas, &$observadas, &$borrador) {
            $entrega = $entregas->get($dep->id);
            $estado = $entrega ? $entrega->estado->value : 'borrador';

            if ($estado === 'consolidada') {
                $consolidadas++;
            } elseif ($estado === 'remitida') {
                $remitidas++;
            } elseif ($estado === 'observada') {
                $observadas++;
            } else {
                $borrador++;
            }

            $totalBienes = (int) ($bienesTotals->get($dep->id) ?? 0);
            $confirmados = (int) ($bienesConfirmados->get($dep->id) ?? 0);
            $porcPatrimonio = $totalBienes > 0 ? round(($confirmados / $totalBienes) * 100, 1) : 100.0;

            return [
                'id' => $dep->id,
                'codigo' => $dep->codigo,
                'nombre' => $dep->nombre,
                'nivel' => $dep->nivel,
                'parent_id' => $dep->parent_id,
                'encargado' => $dep->encargado ? [
                    'id' => $dep->encargado->id,
                    'nombres' => $dep->encargado->nombres,
                    'apellidos' => $dep->encargado->apellidos,
                    'cargo' => $dep->encargado->cargo,
                ] : null,
                'estado_entrega' => $estado,
                'observaciones_abiertas' => (int) ($observacionesAbiertas[$dep->id] ?? 0),
                'patrimonio_total' => $totalBienes,
                'patrimonio_confirmados' => $confirmados,
                'patrimonio_porcentaje' => $porcPatrimonio,
                'remitida_en' => $entrega?->remitida_en?->toIso8601String(),
                'consolidada_en' => $entrega?->consolidada_en?->toIso8601String(),
            ];
        });

        // Totales patrimoniales del ámbito
        $patrimonioQuery = BienPatrimonial::query()->where('proceso_transferencia_id', $procesoId);
        if ($dependenciaIds !== null) {
            $patrimonioQuery->whereIn('dependencia_id', $dependenciaIds);
        }
        $patTotal = (int) (clone $patrimonioQuery)->count();
        $patVerificados = (int) (clone $patrimonioQuery)->whereHas('verificacion', fn ($q) => $q->where('estado', EstadoVerificacionBien::CONFIRMADO->value))->count();
        $patValor = (float) (clone $patrimonioQuery)->sum('valor');

        return [
            'metricas' => [
                'total_dependencias' => $total,
                'consolidadas' => $consolidadas,
                'remitidas' => $remitidas,
                'observadas' => $observadas,
                'borrador' => $borrador,
                'porcentaje_avance' => $total > 0 ? round(($consolidadas / $total) * 100, 1) : 0,
                'patrimonio' => [
                    'total_bienes' => $patTotal,
                    'verificados' => $patVerificados,
                    'pendientes' => max(0, $patTotal - $patVerificados),
                    'porcentaje' => $patTotal > 0 ? round(($patVerificados / $patTotal) * 100, 1) : 0,
                    'valor_total' => $patValor,
                ],
            ],
            'dependencias' => $items->values()->all(),
        ];
    }

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
                'destino_id' => $entrega->dependencia_destino_id,
                'hacia_etts' => $entrega->esHaciaEtts(),
                'remitida_en' => $entrega->remitida_en?->toIso8601String(),
                'revisada_en' => $entrega->revisada_en?->toIso8601String(),
                'consolidada_en' => $entrega->consolidada_en?->toIso8601String(),
                'comentario' => $entrega->comentario,
            ] : null,
        ];
    }

    /**
     * Remite la entrega de la dependencia a su destino (plan §7.8, Etapas 2-4).
     *
     * El destino es el padre jerárquico (`parent_id`). Cuando la dependencia
     * está en la cima de su cadena (1er nivel, sin padre), el destino es NULL =
     * el ETTS institucional (directiva §7.6, Etapa 6): el ETTS recibe estas
     * entregas y las consolida con el mismo `revisarEntrega`.
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
                    // NULL ⇒ ETTS institucional (dependencia sin padre).
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
     * Revisa la entrega remitida por una dependencia subordinada (plan §6
     * Etapas 3-4, §7.8). El responsable del centro de costo padre evalúa los
     * entregables y:
     *  - `observar`   → la devuelve para subsanación (OBSERVADA), o
     *  - `consolidar` → la incorpora a su propia consolidación (CONSOLIDADA).
     *
     * No muta datos de origen (RN-06); solo cambia el estado del flujo y deja
     * constancia del receptor y la fecha de revisión (RN-14).
     *
     * Relación con las observaciones (plan §7.9): marcar la entrega OBSERVADA es
     * el *estado agregado*; las observaciones concretas sobre cada anexo se
     * registran por separado (ObservacionService / POST /api/observaciones) por
     * el mismo revisor (tiene observaciones.registrar). Cuando el responsable
     * subsana la última observación abierta de la dependencia, la entrega vuelve
     * a REMITIDA automáticamente (ObservacionService::reRemitirSiCorresponde).
     */
    public function revisarEntrega(int $dependenciaId, User $usuario, string $accion, ?string $comentario = null): Entrega
    {
        $procesoId = $this->resolverProcesoActivoId();

        $entrega = Entrega::where('proceso_transferencia_id', $procesoId)
            ->where('dependencia_id', $dependenciaId)
            ->firstOrFail();

        if (! in_array($entrega->estado, [EstadoEntrega::REMITIDA, EstadoEntrega::EN_REVISION], true)) {
            throw new \DomainException('Solo pueden revisarse entregas remitidas o en revisión.');
        }

        $nuevoEstado = $accion === 'consolidar'
            ? EstadoEntrega::CONSOLIDADA
            : EstadoEntrega::OBSERVADA;

        return DB::transaction(function () use ($entrega, $usuario, $nuevoEstado, $comentario) {
            $entrega->fill([
                'receptor_id' => $usuario->id,
                'estado' => $nuevoEstado,
                'revisada_en' => Carbon::now(),
                'consolidada_en' => $nuevoEstado === EstadoEntrega::CONSOLIDADA ? Carbon::now() : null,
                'comentario' => $comentario ?? $entrega->comentario,
            ])->save();

            return $entrega->fresh(['emisor', 'receptor', 'dependenciaDestino']);
        });
    }

    /**
     * Genera o consulta el Acta oficial de Transferencia (Anexo 07, §7.10).
     *
     * El acta solo puede emitirse cuando la entrega de la dependencia está
     * CONSOLIDADA (409 en otro caso). Su relación de anexos entregados refleja
     * la presencia real de cada anexo (no un hardcode): se apoya en
     * `obtenerEstadoEntrega()` y en la presencia de documentos pendientes.
     */
    public function obtenerActa(int $dependenciaId, ?User $usuario = null): ActaTransferencia
    {
        $procesoId = $this->resolverProcesoActivoId();
        $dep = Dependencia::findOrFail($dependenciaId);

        $entrega = Entrega::where('proceso_transferencia_id', $procesoId)
            ->where('dependencia_id', $dep->id)
            ->latest('id')
            ->first();

        if ($entrega === null || $entrega->estado !== EstadoEntrega::CONSOLIDADA) {
            throw new HttpResponseException(
                ApiResponse::error(
                    'El acta solo puede emitirse cuando la entrega de la dependencia está consolidada.',
                    409,
                )
            );
        }

        $anexos = $this->presenciaAnexos($dep->id, $procesoId);

        $acta = ActaTransferencia::firstOrNew([
            'proceso_transferencia_id' => $procesoId,
            'dependencia_id' => $dep->id,
        ]);

        $acta->fill([
            'numero_acta' => $acta->numero_acta ?? 'ACTA-'.Carbon::now()->year.'-'.str_replace('.', '', (string) $dep->codigo),
            'fecha_acta' => $acta->fecha_acta ?? Carbon::now()->toDateString(),
            'intervinientes' => $acta->intervinientes ?? [
                'titular_saliente' => null,
                'titular_entrante' => null,
            ],
            'anexos_entregados' => $anexos,
            'estado' => $acta->estado === 'suscrita' ? 'suscrita' : 'generada',
            'generada_por_id' => $usuario?->id ?? $acta->generada_por_id,
        ]);
        $acta->save();

        return $acta->load(['evidencias.subidoPor', 'generadaPor', 'dependencia']);
    }

    /**
     * Presencia real de cada anexo para una dependencia (plan §7.10). Un anexo
     * cuenta como "entregado" si existe al menos un registro suyo (o, para el
     * acta, el propio acto de emitirla).
     *
     * @return array<string, bool>
     */
    public function presenciaAnexos(int $dependenciaId, ?int $procesoId = null): array
    {
        $procesoId = $procesoId ?? $this->resolverProcesoActivoId();
        $estado = $this->obtenerEstadoEntrega($dependenciaId, $procesoId);

        $documentos = DocumentoPendiente::where('dependencia_id', $dependenciaId)
            ->where('proceso_transferencia_id', $procesoId)
            ->exists();

        return [
            'anexo_01' => $documentos,
            'anexo_02' => (bool) ($estado['anexo02_gestion']['existe'] ?? false),
            'anexo_03' => ($estado['anexo03_acervo']['total_series'] ?? 0) > 0,
            'anexo_04' => ($estado['anexo04_patrimonio']['total_bienes'] ?? 0) > 0,
            'anexo_05' => ($estado['anexo05_personal']['total_personal'] ?? 0) > 0,
            'anexo_06' => ($estado['anexo06_nopatrimonial']['total_bienes'] ?? 0) > 0,
            'anexo_07' => true,
        ];
    }

    private function resolverProcesoActivoId(): int
    {
        return (int) (ProcesoTransferencia::where('estado', 'abierto')->value('id') ?? 1);
    }
}

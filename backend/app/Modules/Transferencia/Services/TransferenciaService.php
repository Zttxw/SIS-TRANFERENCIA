<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Services;

use App\Models\User;
use App\Modules\Acervo\Models\AcervoDocumental;
use App\Modules\Auth\Services\CoordinacionEtte;
use App\Modules\Gestion\Models\InformeGestion;
use App\Modules\NoPatrimonial\Models\BienNoPatrimonial;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Patrimonio\Models\BienPatrimonial;
use App\Modules\Personal\Models\Personal;
use App\Modules\Transferencia\Models\Entrega;
use App\Modules\Transferencia\Models\Observacion;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\AccionPlazo;
use App\Support\Enums\EstadoEntrega;
use App\Support\Enums\EstadoVerificacionBien;
use App\Support\Http\ApiResponse;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class TransferenciaService
{
    public function __construct(
        protected CronogramaService $cronograma,
        protected ConsolidacionCentroCosto $consolidacion,
        protected CoordinacionEtte $coordinacion,
    ) {}

    /**
     * Lista entregas acotadas al ámbito institucional (filtros: dependencia_id, estado, dependencia_ids).
     *
     * @param  array<string, mixed>  $filtros
     */
    public function listarEntregas(array $filtros = []): LengthAwarePaginator
    {
        $procesoId = $this->resolverProcesoActivoId();

        $query = Entrega::query()
            ->with(['dependencia', 'dependenciaDestino', 'emisor', 'presentadaPor'])
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

        $query = Dependencia::query()->centrosCosto()
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

        $observacionesPorCc = Observacion::query()->vigentes()
            ->where('proceso_transferencia_id', $procesoId)
            ->whereIn('dependencia_id', $ids)
            ->selectRaw('dependencia_id, count(*) as total')
            ->groupBy('dependencia_id')
            ->pluck('total', 'dependencia_id');

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
        $porEstado = array_fill_keys(array_map(fn (EstadoEntrega $e): string => $e->value, EstadoEntrega::cases()), 0);
        $actividades = $this->cronograma->actividadesDelProceso($procesoId);
        $plazosVencidos = 0;

        $items = $dependencias->map(function ($dep) use ($entregas, $observacionesPorCc, $bienesTotals, $bienesConfirmados, $actividades, &$porEstado, &$plazosVencidos) {
            $entrega = $entregas->get($dep->id);
            $estadoEntrega = $entrega?->estado ?? EstadoEntrega::BORRADOR;
            $estado = $estadoEntrega->value;
            $porEstado[$estado]++;

            // F-16: plazo de la siguiente acción que le toca al CC.
            $accion = AccionPlazo::siguientePara($estadoEntrega);
            $plazo = $accion ? $this->cronograma->situacionPlazo($actividades, $dep->id, $accion) : null;
            $plazosVencidos += ($plazo['vencido'] ?? false) ? 1 : 0;

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
                'observaciones' => (int) ($observacionesPorCc->get($dep->id) ?? 0),
                'patrimonio_total' => $totalBienes,
                'patrimonio_confirmados' => $confirmados,
                'patrimonio_porcentaje' => $porcPatrimonio,
                'presentada_en' => $entrega?->presentada_en?->toIso8601String(),
                'remitida_en' => $entrega?->remitida_en?->toIso8601String(),
                'enviado_tarde' => $this->consolidacion->enviadoTarde($dep, $entregas),
                'plazo' => $plazo,
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
        $remitidas = array_sum(array_map(fn (EstadoEntrega $e): int => $porEstado[$e->value], EstadoEntrega::cadenaInstitucional()));

        return [
            'metricas' => [
                'total_dependencias' => $total,
                'borrador' => $porEstado[EstadoEntrega::BORRADOR->value],
                'en_revision' => $porEstado[EstadoEntrega::EN_REVISION->value],
                'acta_suscrita' => $porEstado[EstadoEntrega::ACTA_SUSCRITA->value],
                // Remitidas: incluye las que siguen la cadena ETTS → ETTE.
                'remitidas' => $remitidas,
                'recibidas_etts' => $porEstado[EstadoEntrega::RECIBIDA_ETTS->value],
                'remitidas_ette' => $porEstado[EstadoEntrega::REMITIDA_ETTE->value],
                'recibidas_ette' => $porEstado[EstadoEntrega::RECIBIDA_ETTE->value],
                'porcentaje_avance' => $total > 0 ? round(($remitidas / $total) * 100, 1) : 0,
                'plazos_vencidos' => $plazosVencidos,
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
        $entrega = Entrega::with(['emisor', 'presentadaPor', 'dependenciaDestino'])
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
                // Al presentar se crea la fila con los pendientes congelados (D-09);
                // el informe existe cuando el responsable lo guardó (con funciones).
                'existe' => ! empty($informe?->funciones),
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
            'observaciones' => Observacion::vigentes()->delCentroCosto($dependenciaId, $procesoId)->count(),
            'entrega' => $entrega ? [
                'id' => $entrega->id,
                'estado' => $entrega->estado->value,
                'destino_id' => $entrega->dependencia_destino_id,
                'hacia_etts' => $entrega->esHaciaEtts(),
                'presentada_en' => $entrega->presentada_en?->toIso8601String(),
                'presentada_por' => $entrega->presentadaPor?->name,
                'remitida_en' => $entrega->remitida_en?->toIso8601String(),
                'comentario' => $entrega->comentario,
                'hijos_pendientes_al_remitir' => $entrega->hijos_pendientes_al_remitir ?? [],
                'recibida_etts_en' => $entrega->recibida_etts_en?->toIso8601String(),
                'remitida_ette_en' => $entrega->remitida_ette_en?->toIso8601String(),
                'recibida_ette_en' => $entrega->recibida_ette_en?->toIso8601String(),
            ] : null,
            // Quién revisa y firma presencialmente por el lado ETTE.
            'firmante_ette' => $this->firmanteEtte($dependenciaId),
            // Hijos directos que aún no envían: advertencia al remitir (D-08).
            'hijos_pendientes' => $this->consolidacion->hijosPendientes($dep),
        ];
    }

    /**
     * Firmante designado del lado ETTE del CC (coordinador o titular suplente).
     *
     * @return array{id: int, nombre: string, dni: ?string, en_calidad_de: string, motivo_suplencia: ?string}|null
     */
    private function firmanteEtte(int $dependenciaId): ?array
    {
        $ette = $this->coordinacion->firmanteDe($dependenciaId);

        return $ette === null ? null : [
            'id' => $ette['usuario']->id,
            'nombre' => $ette['usuario']->name,
            'dni' => $ette['usuario']->dni,
            'en_calidad_de' => $ette['en_calidad_de']->value,
            'motivo_suplencia' => $ette['motivo_suplencia'],
        ];
    }

    /**
     * Remite la entrega suscrita del CC a su destino (plan §3.1).
     *
     * Ruteo del Anexo 01 (D-02): el destino es el CC padre registrado en CEPLAN
     * (`parent_id`), sin considerar el nivel. El CC cuyo padre es él mismo se
     * guarda sin padre y su destino es NULL = el ETTS institucional.
     *
     * D-08: el padre puede remitir aunque algún hijo directo no haya enviado; en
     * ese caso exige `confirmarSinHijos` (409 con la lista si falta) y deja
     * registrados los hijos pendientes en la entrega.
     */
    public function remitirEntrega(int $dependenciaId, User $usuario, ?string $comentario = null, bool $confirmarSinHijos = false): Entrega
    {
        $procesoId = $this->resolverProcesoActivoId();
        $dep = Dependencia::findOrFail($dependenciaId);

        if (! $dep->es_centro_costo) {
            throw new HttpResponseException(ApiResponse::error(
                'Solo los centros de costo del Anexo 01 envían su entrega.',
                422,
            ));
        }

        // El vencimiento del cronograma bloquea la remisión (D-12). Se cumple en
        // la API, no solo en la interfaz; 409 con causa y plazo.
        $this->cronograma->exigirPlazoVigente($procesoId, $dep->id, AccionPlazo::REMITIR);

        return DB::transaction(function () use ($dep, $procesoId, $usuario, $comentario, $confirmarSinHijos) {
            Dependencia::whereKey($dep->id)->lockForUpdate()->firstOrFail();
            $entrega = Entrega::where('proceso_transferencia_id', $procesoId)
                ->where('dependencia_id', $dep->id)
                ->lockForUpdate()
                ->first();

            // D-07 y D-05: solo se remite lo cerrado para firma y con los anexos
            // 02 al 07 firmados por ambos lados (firmar es aprobar).
            if (! ($entrega?->estado ?? EstadoEntrega::BORRADOR)->admiteFirma()) {
                throw new HttpResponseException(ApiResponse::error(
                    'Solo se remite una entrega firmada por el responsable y el coordinador ETTE, con el acta suscrita. Estado actual: "'
                        .($entrega?->estado ?? EstadoEntrega::BORRADOR)->etiqueta().'".',
                    409,
                ));
            }

            $requisitos = app(SuscripcionEntrega::class)->requisitosRemision($dep->id, $usuario);
            if (! $requisitos['puede_remitir']) {
                throw new HttpResponseException(ApiResponse::error(
                    'Faltan firmas vigentes del responsable y del coordinador ETTE en los anexos 02 al 07. '
                        .$this->firmasFaltantes($requisitos),
                    409,
                ));
            }

            $hijosPendientes = $this->consolidacion->hijosPendientes($dep);
            if ($hijosPendientes !== [] && ! $confirmarSinHijos) {
                throw new HttpResponseException(ApiResponse::error(
                    'Hay centros de costo dependientes que aún no envían su entrega: '
                        .implode(', ', array_column($hijosPendientes, 'codigo'))
                        .'. Confirme si desea remitir sin ellos; podrán enviar después.',
                    409,
                    ['hijos_pendientes' => $hijosPendientes],
                ));
            }

            $entrega->fill([
                // NULL ⇒ ETTS institucional (CC cuyo padre es él mismo).
                'dependencia_destino_id' => $dep->parent_id,
                'emisor_id' => $usuario->id,
                'estado' => EstadoEntrega::REMITIDA,
                'remitida_en' => Carbon::now(),
                'comentario' => $comentario,
                'hijos_pendientes_al_remitir' => $hijosPendientes === [] ? null : $hijosPendientes,
            ])->save();

            return $entrega;
        });
    }

    /**
     * Detalle legible de las firmas pendientes, por documento y por lado.
     *
     * @param  array{pendientes: list<string>, documentos?: array<string, array<string, mixed>>}  $requisitos
     */
    private function firmasFaltantes(array $requisitos): string
    {
        $detalle = array_map(function (string $tipo) use ($requisitos): string {
            $documento = $requisitos['documentos'][$tipo] ?? [];
            $lados = array_filter([
                empty($documento['entidad']) ? 'responsable' : null,
                empty($documento['ette']) ? 'coordinador ETTE' : null,
            ]);

            return str_replace('anexo', 'Anexo ', $tipo).' ('.implode(' y ', $lados).')';
        }, $requisitos['pendientes']);

        return 'Pendientes: '.implode(', ', $detalle).'.';
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

        return [
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

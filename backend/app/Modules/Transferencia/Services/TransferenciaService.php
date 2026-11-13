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
use App\Modules\Transferencia\Models\FirmaAnexo;
use App\Modules\Transferencia\Models\Observacion;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\CaracterFirma;
use App\Support\Enums\DeclaracionActa;
use App\Support\Enums\EstadoEntrega;
use App\Support\Enums\EstadoFirma;
use App\Support\Enums\EstadoObservacion;
use App\Support\Enums\EstadoVerificacionBien;
use App\Support\Enums\Rol;
use App\Support\Http\ApiResponse;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class TransferenciaService
{
    public function __construct(
        protected CronogramaService $cronograma = new CronogramaService,
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

        // C2: el vencimiento del cronograma bloquea la remisión (RF-007, C-03).
        // Se cumple en la API, no solo en la interfaz; 409 con causa y plazo.
        $this->cronograma->exigirPlazoVigente(
            $procesoId,
            $dep->id,
            CronogramaService::OPERACION_REMISION,
        );

        $this->asegurarVersionCorreccion($procesoId, $dep->id);

        return DB::transaction(function () use ($dep, $procesoId, $usuario, $comentario) {
            Dependencia::whereKey($dep->id)->lockForUpdate()->firstOrFail();
            $requisitos = app(FirmaperuRegistroService::class)->requisitosRemision($dep->id, $usuario);
            if (! $requisitos['puede_remitir']) {
                throw new HttpResponseException(ApiResponse::error(
                    'Genere los PDF y obtenga la firma vigente del jefe en los anexos 02 al 07 antes de remitir. Pendientes: '
                        .implode(', ', array_map(fn (string $tipo): string => str_replace('anexo', 'Anexo ', $tipo), $requisitos['pendientes'])),
                    409,
                ));
            }
            $entrega = Entrega::where('proceso_transferencia_id', $procesoId)
                ->where('dependencia_id', $dep->id)
                ->first();

            // H-01: transiciones estrictas. Solo puede remitirse una entrega que
            // aún no existe (primera remisión) o que está en un estado que admite
            // (re)envío: BORRADOR (preparación) u OBSERVADA (tras subsanar). Una
            // entrega ya REMITIDA/EN_REVISION/CONSOLIDADA/CERRADA no vuelve a
            // remitirse por este endpoint; evita re-remitir lo ya consolidado.
            $estadosRemisibles = [EstadoEntrega::BORRADOR, EstadoEntrega::OBSERVADA];
            if ($entrega !== null && ! in_array($entrega->estado, $estadosRemisibles, true)) {
                throw new HttpResponseException(
                    ApiResponse::error(
                        'La entrega no puede remitirse desde el estado "'.$entrega->estado->etiqueta().'".',
                        409,
                    )
                );
            }

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

        // H-02: quien revisa debe ser el receptor del destino de la entrega, no
        // cualquiera cuyo subárbol contenga a la dependencia que remitió (eso
        // incluiría a la propia dependencia emisora, que no puede revisarse a sí
        // misma). El destino es el padre jerárquico; NULL = ETTS institucional.
        if (! $this->esReceptorDelDestino($usuario, $entrega)) {
            throw new HttpResponseException(
                ApiResponse::error(
                    'Solo el receptor del destino de la entrega puede revisarla.',
                    403,
                )
            );
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

            if ($nuevoEstado === EstadoEntrega::OBSERVADA) {
                $entrega->forceFill(['version_acta_correccion' => null])->save();
                $this->asegurarVersionCorreccion($entrega->proceso_transferencia_id, $entrega->dependencia_id);
            }

            return $entrega->fresh(['emisor', 'receptor', 'dependenciaDestino']);
        });
    }

    /**
     * Genera o consulta el Acta oficial de Transferencia (Anexo 07, §7.10).
     *
     * B3 (D-05/D-06): el acta se emite ANTES de remitir. En ese momento solo
     * declara la *suscripción de la hija* (`DeclaracionActa::SUSCRIPCION_HIJA`):
     * la recepción y la consolidación del padre todavía no ocurren y el acta no
     * debe afirmarlas. Tras consolidar, el mismo endpoint actualiza la
     * declaración a `RECEPCION_CONSOLIDACION`.
     *
     * Momentos admitidos para emitir/consultar:
     *  - sin entrega / BORRADOR / OBSERVADA ⇒ pre-remisión, suscripción de la hija;
     *  - REMITIDA / EN_REVISION ⇒ ya remitida: se conserva la declaración de
     *    suscripción (no se degrada ni se adelanta la consolidación);
     *  - CONSOLIDADA ⇒ recepción y consolidación.
     *
     * Su relación de anexos entregados refleja la presencia real de cada anexo
     * (no un hardcode): se apoya en `obtenerEstadoEntrega()` y en la presencia de
     * documentos pendientes. El *gate* que exige el acta suscrita como condición
     * de remitir queda pendiente de la matriz de firmantes obligatorios (D-02).
     */
    public function obtenerActa(int $dependenciaId, ?User $usuario = null): ActaTransferencia
    {
        $procesoId = $this->resolverProcesoActivoId();
        $dep = Dependencia::findOrFail($dependenciaId);

        $entrega = Entrega::where('proceso_transferencia_id', $procesoId)
            ->where('dependencia_id', $dep->id)
            ->latest('id')
            ->first();

        $estado = $entrega?->estado ?? EstadoEntrega::BORRADOR;

        // Tras consolidar, el acta declara recepción/consolidación; en cualquier
        // momento anterior solo declara la suscripción de la hija (D-06).
        $declara = $estado === EstadoEntrega::CONSOLIDADA
            ? DeclaracionActa::RECEPCION_CONSOLIDACION
            : DeclaracionActa::SUSCRIPCION_HIJA;

        $anexos = $this->presenciaAnexos($dep->id, $procesoId);

        $acta = ActaTransferencia::firstOrNew([
            'proceso_transferencia_id' => $procesoId,
            'dependencia_id' => $dep->id,
        ]);

        if ($acta->exists && $acta->declara !== $declara) {
            $this->versionarActaPorCorreccion($procesoId, $dep->id);
            $acta->refresh();
        }

        $intervinientes = $acta->intervinientes ?? [];
        $intervinientes['titular_saliente'] = $this->completarInterviniente(
            $intervinientes['titular_saliente'] ?? null, $this->responsableActa($dep),
        );
        if ($dep->padre) {
            $intervinientes['responsable_superior'] = $this->completarInterviniente(
                $intervinientes['responsable_superior'] ?? null, $this->responsableActa($dep->padre),
            );
        }

        $acta->fill([
            'numero_acta' => $acta->numero_acta ?? 'ACTA-'.Carbon::now()->year.'-'.str_replace('.', '', (string) $dep->codigo),
            'fecha_acta' => $acta->fecha_acta ?? Carbon::now()->toDateString(),
            'intervinientes' => $intervinientes,
            'anexos_entregados' => $anexos,
            'estado' => $acta->estado === 'suscrita' ? 'suscrita' : 'generada',
            'declara' => $declara,
            'version' => $acta->version ?? 1,
            'generada_por_id' => $acta->generada_por_id ?? $usuario?->id,
        ]);
        $acta->save();
        $this->asegurarVersionCorreccion($procesoId, $dep->id);

        return $acta->refresh()->load(['evidencias.subidoPor', 'generadaPor', 'dependencia.padre:id,codigo,nombre']);
    }

    /** @return array{nombre: string, dni: string, cargo: string} */
    private function responsableActa(Dependencia $dependencia): array
    {
        $cuenta = User::where('activo', true)->whereHas('asignacionesRol', fn ($q) => $q
            ->where('rol', Rol::RESPONSABLE_CENTRO_COSTO->value)
            ->where('proceso_transferencia_id', $dependencia->proceso_transferencia_id)
            ->where('dependencia_id', $dependencia->id))->orderBy('id')->first();
        $servidor = $cuenta
            ? $dependencia->servidores()->where('proceso_transferencia_id', $dependencia->proceso_transferencia_id)->where('dni', $cuenta->dni)->first()
            : $dependencia->encargado;

        return [
            'nombre' => $cuenta?->name ?: ($servidor?->nombreCompleto() ?? ''),
            'dni' => $cuenta?->dni ?: ($servidor?->dni ?? ''),
            'cargo' => $servidor?->cargo ?? '',
        ];
    }

    /** @param array{nombre: string, dni: string, cargo: string} $automatico
     * @return array{nombre: string, dni: string, cargo: string}
     */
    private function completarInterviniente(mixed $existente, array $automatico): array
    {
        if (is_string($existente)) {
            $existente = ['nombre' => $existente];
        }
        foreach (['nombre', 'dni', 'cargo'] as $campo) {
            if (is_array($existente) && trim((string) ($existente[$campo] ?? '')) !== '') {
                $automatico[$campo] = (string) $existente[$campo];
            }
        }

        return $automatico;
    }

    /** La corrección obtiene versión antes de firmar, incluso para entregas observadas anteriores a esta integración. */
    public function asegurarVersionCorreccion(int $procesoId, int $dependenciaId): void
    {
        DB::transaction(function () use ($procesoId, $dependenciaId): void {
            Dependencia::whereKey($dependenciaId)->lockForUpdate()->firstOrFail();
            $entrega = Entrega::where('proceso_transferencia_id', $procesoId)
                ->where('dependencia_id', $dependenciaId)->lockForUpdate()->first();
            if (! $entrega || $entrega->estado !== EstadoEntrega::OBSERVADA || $entrega->version_acta_correccion !== null) {
                return;
            }
            $acta = ActaTransferencia::where('proceso_transferencia_id', $procesoId)
                ->where('dependencia_id', $dependenciaId)->lockForUpdate()->first();
            if ($acta) {
                $this->versionarActaPorCorreccion($procesoId, $dependenciaId);
                $entrega->forceFill(['version_acta_correccion' => $acta->fresh()->version])->save();
            }
        });
    }

    /**
     * B3c (D-06): sube la versión del acta de la dependencia e invalida las
     * firmas OBLIGATORIAS de la versión anterior cuando se corrige una entrega
     * observada y se vuelve a remitir.
     *
     * - El acta (si existe) incrementa `version` y vuelve a `generada` (debe
     *   re-suscribirse). Las firmas previas se conservan ligadas a su versión.
     * - Las firmas obligatorias en estado PENDIENTE o FIRMADA de la versión
     *   vigente pasan a CANCELADA: una firma de una versión observada no ampara
     *   la versión corregida. Las opcionales (p. ej. ETTE) no se tocan aquí.
     *
     * No presupone la matriz de firmantes (D-02): solo invalida lo ya registrado
     * como obligatorio; no crea firmas ni decide quién debe firmar.
     */
    private function versionarActaPorCorreccion(int $procesoId, int $dependenciaId): void
    {
        $acta = ActaTransferencia::where('proceso_transferencia_id', $procesoId)
            ->where('dependencia_id', $dependenciaId)
            ->first();

        if ($acta === null) {
            return;
        }

        $versionAnterior = $acta->version ?? 1;

        FirmaAnexo::query()
            ->where('firmable_type', $acta->getMorphClass())
            ->where('firmable_id', $acta->id)
            ->where('version', $versionAnterior)
            ->where('caracter', CaracterFirma::OBLIGATORIA->value)
            ->whereIn('estado', [EstadoFirma::PENDIENTE->value, EstadoFirma::FIRMADA->value])
            ->update(['estado' => EstadoFirma::CANCELADA->value]);

        $acta->fill([
            'version' => $versionAnterior + 1,
            'estado' => 'generada',
            'ruta_pdf_suscrito' => null,
        ])->save();
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

    /**
     * ¿El usuario ocupa el destino de la entrega y puede por tanto revisarla?
     *
     * - Destino NULL ⇒ ETTS institucional: solo un rol de ámbito global (ETTS/
     *   administrador) recibe y revisa en la cima de la cadena.
     * - Destino concreto ⇒ el revisor debe tener esa dependencia *destino* en su
     *   ámbito (se ubica en el padre receptor o por encima), no basta con que su
     *   subárbol contenga a la dependencia emisora.
     *
     * Regla mínima segura (H-02). El receptor formal exacto por cuenta queda
     * pendiente de D-06; aquí se impide, al menos, que la emisora se revise a sí
     * misma o que un par en el mismo subárbol tome la revisión del destino.
     */
    private function esReceptorDelDestino(User $usuario, Entrega $entrega): bool
    {
        if ($entrega->dependencia_destino_id === null) {
            return $usuario->tieneAmbitoGlobal();
        }

        return $usuario->puedeAccederDependencia($entrega->dependencia_destino_id);
    }

    private function resolverProcesoActivoId(): int
    {
        return (int) (ProcesoTransferencia::where('estado', 'abierto')->value('id') ?? 1);
    }
}

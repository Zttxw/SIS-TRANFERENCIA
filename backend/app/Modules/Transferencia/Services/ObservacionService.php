<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Services;

use App\Models\User;
use App\Modules\Acervo\Models\AcervoDocumental;
use App\Modules\Documentos\Models\DocumentoPendiente;
use App\Modules\Gestion\Models\InformeGestion;
use App\Modules\NoPatrimonial\Models\BienNoPatrimonial;
use App\Modules\Patrimonio\Models\BienPatrimonial;
use App\Modules\Personal\Models\Personal;
use App\Modules\Transferencia\Models\Entrega;
use App\Modules\Transferencia\Models\Observacion;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\EstadoEntrega;
use App\Support\Enums\EstadoObservacion;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Observaciones y subsanaciones sobre los anexos (plan §7.9). El coordinador
 * ETTE (o responsable revisor) formula observaciones concretas sobre un elemento
 * de un anexo; el responsable las subsana. Al subsanar la última observación
 * abierta de una entrega OBSERVADA, la entrega se re-remite automáticamente.
 */
class ObservacionService
{
    /**
     * Anexos observables: clave corta → modelo. Evita aceptar class strings
     * arbitrarios como `observable_type` desde el cliente.
     *
     * @var array<string, class-string<Model>>
     */
    private const ANEXOS = [
        'gestion' => InformeGestion::class,
        'acervo' => AcervoDocumental::class,
        'patrimonio' => BienPatrimonial::class,
        'personal' => Personal::class,
        'nopatrimonial' => BienNoPatrimonial::class,
        'documento' => DocumentoPendiente::class,
    ];

    /**
     * @return array<string, class-string<Model>>
     */
    public static function anexosObservables(): array
    {
        return self::ANEXOS;
    }

    /**
     * Resuelve el registro observable a partir de la clave de anexo y su id.
     */
    public function resolverObservable(string $anexo, int $observableId): Model
    {
        $modelo = self::ANEXOS[$anexo];

        return $modelo::findOrFail($observableId);
    }

    /**
     * Lista observaciones acotadas al ámbito (filtros: dependencia_id, anexo,
     * estado, dependencia_ids del ámbito).
     *
     * @param  array<string, mixed>  $filtros
     */
    public function listar(array $filtros = []): LengthAwarePaginator
    {
        $query = Observacion::query()
            ->with(['autor', 'responsable', 'observable'])
            ->orderByDesc('id');

        if (! empty($filtros['anexo']) && isset(self::ANEXOS[$filtros['anexo']])) {
            $query->where('observable_type', self::ANEXOS[$filtros['anexo']]);
        }

        if (! empty($filtros['estado'])) {
            $query->where('estado', (string) $filtros['estado']);
        }

        // Acotación por dependencia: la observación no guarda dependencia_id
        // propia; se filtra por la dependencia del observable mediante los
        // conjuntos de ids ya resueltos por el controller (ámbito) y/o el
        // filtro explícito. Se aplica por tipo de anexo.
        $dependenciaIds = $this->resolverDependenciaIdsFiltro($filtros);
        if ($dependenciaIds !== null) {
            $query->where(function ($q) use ($dependenciaIds) {
                foreach (self::ANEXOS as $modelo) {
                    $q->orWhere(function ($sub) use ($modelo, $dependenciaIds) {
                        $sub->where('observable_type', $modelo)
                            ->whereIn('observable_id', function ($inner) use ($modelo, $dependenciaIds) {
                                $instancia = new $modelo;
                                $inner->select('id')
                                    ->from($instancia->getTable())
                                    ->whereIn('dependencia_id', $dependenciaIds);
                            });
                    });
                }
            });
        }

        $perPage = isset($filtros['per_page']) ? min((int) $filtros['per_page'], 100) : 15;

        return $query->paginate($perPage);
    }

    /**
     * Registra una observación sobre un elemento de anexo (coordinador).
     */
    public function registrar(Model $observable, User $autor, string $descripcion): Observacion
    {
        /** @var Observacion $observacion */
        $observacion = $observable->observaciones()->create([
            'proceso_transferencia_id' => $observable->proceso_transferencia_id,
            'autor_id' => $autor->id,
            'descripcion' => $descripcion,
            'estado' => EstadoObservacion::ABIERTA,
        ]);

        return $observacion->load(['autor', 'observable']);
    }

    /**
     * Subsana una observación (responsable): registra la respuesta y la marca
     * SUBSANADA. Si era la última observación abierta de una entrega OBSERVADA,
     * re-remite la entrega automáticamente (vuelve a REMITIDA).
     */
    public function subsanar(Observacion $observacion, User $responsable, string $respuesta): Observacion
    {
        if (! in_array($observacion->estado, [EstadoObservacion::ABIERTA, EstadoObservacion::EN_SUBSANACION], true)) {
            throw new \DomainException('Solo pueden subsanarse observaciones abiertas o en subsanación.');
        }

        return DB::transaction(function () use ($observacion, $responsable, $respuesta) {
            $observacion->fill([
                'responsable_id' => $responsable->id,
                'respuesta_subsanacion' => $respuesta,
                'estado' => EstadoObservacion::SUBSANADA,
                'subsanada_en' => Carbon::now(),
            ])->save();

            $this->reRemitirSiCorresponde($observacion, $responsable);

            return $observacion->fresh(['autor', 'responsable', 'observable']);
        });
    }

    /**
     * Desestima una observación (autor/coordinador): se cierra sin subsanación.
     */
    public function desestimar(Observacion $observacion, User $usuario): Observacion
    {
        if (! in_array($observacion->estado, [EstadoObservacion::ABIERTA, EstadoObservacion::EN_SUBSANACION], true)) {
            throw new \DomainException('Solo pueden desestimarse observaciones abiertas o en subsanación.');
        }

        return DB::transaction(function () use ($observacion, $usuario) {
            $observacion->fill([
                'responsable_id' => $usuario->id,
                'estado' => EstadoObservacion::DESESTIMADA,
            ])->save();

            $this->reRemitirSiCorresponde($observacion, $usuario);

            return $observacion->fresh(['autor', 'responsable', 'observable']);
        });
    }

    /**
     * Devuelve la dependencia del observable (para ámbito y entrega).
     */
    public function dependenciaDelObservable(Observacion $observacion): ?int
    {
        $observable = $observacion->observable;

        return $observable?->dependencia_id;
    }

    /**
     * Si tras cerrar esta observación ya no quedan observaciones abiertas de la
     * misma dependencia y su entrega está OBSERVADA, la re-remite (REMITIDA).
     */
    private function reRemitirSiCorresponde(Observacion $observacion, User $usuario): void
    {
        $dependenciaId = $this->dependenciaDelObservable($observacion);
        if ($dependenciaId === null) {
            return;
        }

        if ($this->hayObservacionesAbiertas($dependenciaId, $observacion->proceso_transferencia_id)) {
            return;
        }

        $entrega = Entrega::where('proceso_transferencia_id', $observacion->proceso_transferencia_id)
            ->where('dependencia_id', $dependenciaId)
            ->latest('id')
            ->first();

        if ($entrega !== null && $entrega->estado === EstadoEntrega::OBSERVADA) {
            $entrega->fill([
                'emisor_id' => $usuario->id,
                'estado' => EstadoEntrega::REMITIDA,
                'remitida_en' => Carbon::now(),
            ])->save();
        }
    }

    /**
     * ¿Quedan observaciones abiertas (ABIERTA/EN_SUBSANACION) para algún anexo
     * de la dependencia dada en el proceso?
     */
    public function hayObservacionesAbiertas(int $dependenciaId, int $procesoId): bool
    {
        foreach (self::ANEXOS as $modelo) {
            $instancia = new $modelo;
            $existe = Observacion::query()
                ->abiertas()
                ->where('proceso_transferencia_id', $procesoId)
                ->where('observable_type', $modelo)
                ->whereIn('observable_id', function ($inner) use ($instancia, $dependenciaId) {
                    $inner->select('id')
                        ->from($instancia->getTable())
                        ->where('dependencia_id', $dependenciaId);
                })
                ->exists();

            if ($existe) {
                return true;
            }
        }

        return false;
    }

    /**
     * Combina el filtro explícito `dependencia_id` con el ámbito `dependencia_ids`.
     *
     * @param  array<string, mixed>  $filtros
     * @return list<int>|null null = sin acotación (ámbito global y sin filtro)
     */
    private function resolverDependenciaIdsFiltro(array $filtros): ?array
    {
        $ambito = array_key_exists('dependencia_ids', $filtros) ? $filtros['dependencia_ids'] : null;

        if (! empty($filtros['dependencia_id'])) {
            $pedida = (int) $filtros['dependencia_id'];

            // El controller ya validó que la dependencia pedida está en ámbito.
            return [$pedida];
        }

        return $ambito;
    }

    public function resolverProcesoActivoId(): int
    {
        return (int) (ProcesoTransferencia::where('estado', 'abierto')->value('id') ?? 1);
    }
}

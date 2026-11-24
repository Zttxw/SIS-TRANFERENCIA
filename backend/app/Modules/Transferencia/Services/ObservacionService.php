<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Services;

use App\Models\User;
use App\Modules\Acervo\Models\AcervoDocumental;
use App\Modules\Auth\Services\CoordinacionEtte;
use App\Modules\Documentos\Models\DocumentoPendiente;
use App\Modules\Gestion\Models\InformeGestion;
use App\Modules\NoPatrimonial\Models\BienNoPatrimonial;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Patrimonio\Models\BienPatrimonial;
use App\Modules\Personal\Models\Personal;
use App\Modules\Transferencia\Models\Observacion;
use App\Support\Enums\EstadoObservacion;
use App\Support\Http\ApiResponse;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\DB;

/**
 * Observaciones del coordinador ETTE (D-07). Son constancia: durante la
 * revisión presencial, el responsable del CC las registra en su sesión a nombre
 * del firmante ETTE designado (coordinador o titular suplente), sobre una fila
 * de un anexo o sobre el anexo completo. No se subsanan ni cambian el estado de
 * la entrega; figuran en el Acta 07 y en el reporte al comité ETTE. Se
 * registran y retiran mientras la entrega está en revisión y el acta sin firmas.
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

    public function __construct(
        private readonly RevisionEntregaService $revision,
        private readonly CoordinacionEtte $coordinacion,
    ) {}

    /**
     * @return array<string, class-string<Model>>
     */
    public static function anexosObservables(): array
    {
        return self::ANEXOS;
    }

    /**
     * Resuelve la fila observada a partir de la clave de anexo y su id.
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
            ->with(['autor', 'registradaPor', 'observable', 'dependencia:id,codigo,nombre'])
            ->orderByDesc('id');

        if (! empty($filtros['anexo']) && isset(self::ANEXOS[$filtros['anexo']])) {
            $query->where('anexo', (string) $filtros['anexo']);
        }

        if (! empty($filtros['estado'])) {
            $query->where('estado', (string) $filtros['estado']);
        }

        // El controller ya validó que la dependencia pedida está en el ámbito.
        if (! empty($filtros['dependencia_id'])) {
            $query->where('dependencia_id', (int) $filtros['dependencia_id']);
        } elseif (array_key_exists('dependencia_ids', $filtros) && $filtros['dependencia_ids'] !== null) {
            $query->whereIn('dependencia_id', $filtros['dependencia_ids']);
        }

        $perPage = isset($filtros['per_page']) ? min((int) $filtros['per_page'], 100) : 15;

        return $query->paginate($perPage);
    }

    /**
     * Registra, a nombre del firmante ETTE designado, una observación sobre una
     * fila (`$observable`) o sobre el anexo completo (`$observable` null).
     */
    public function registrar(
        Dependencia $dependencia,
        string $anexo,
        ?Model $observable,
        User $operador,
        string $descripcion,
    ): Observacion {
        return DB::transaction(function () use ($dependencia, $anexo, $observable, $operador, $descripcion): Observacion {
            $this->revision->exigirEnRevision($dependencia);
            $this->revision->exigirActaSinFirmas($dependencia, $operador);
            $ette = $this->coordinacion->firmanteDe($dependencia->id);
            if ($ette === null) {
                throw new HttpResponseException(ApiResponse::error(
                    'El centro de costo no tiene coordinador ETTE vigente ni un titular ETTE designado en suplencia.', 409));
            }

            $observacion = Observacion::create([
                'proceso_transferencia_id' => $dependencia->proceso_transferencia_id,
                'dependencia_id' => $dependencia->id,
                'anexo' => $anexo,
                'observable_type' => $observable?->getMorphClass(),
                'observable_id' => $observable?->getKey(),
                'autor_id' => $ette['usuario']->id,
                'registrada_por_id' => $operador->id,
                'en_calidad_de' => $ette['en_calidad_de'],
                'motivo_suplencia' => $ette['motivo_suplencia'],
                'descripcion' => $descripcion,
                'estado' => EstadoObservacion::REGISTRADA,
            ]);

            return $observacion->load(['autor', 'registradaPor', 'observable']);
        });
    }

    /**
     * Retira una observación registrada mientras la entrega sigue en revisión y
     * el acta sin firmas; después queda como constancia.
     */
    public function retirar(Observacion $observacion, User $operador): Observacion
    {
        return DB::transaction(function () use ($observacion, $operador): Observacion {
            $this->revision->exigirEnRevision($observacion->dependencia);
            $this->revision->exigirActaSinFirmas($observacion->dependencia, $operador);

            if ($observacion->estado !== EstadoObservacion::REGISTRADA) {
                throw new HttpResponseException(ApiResponse::error('La observación ya fue retirada.', 409));
            }

            $observacion->update(['estado' => EstadoObservacion::RETIRADA]);

            return $observacion->fresh(['autor', 'registradaPor', 'observable']);
        });
    }
}

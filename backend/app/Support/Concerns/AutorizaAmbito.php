<?php

declare(strict_types=1);

namespace App\Support\Concerns;

use App\Models\User;
use App\Support\Http\ApiResponse;
use Illuminate\Http\Exceptions\HttpResponseException;

/**
 * Autorización por ámbito (dependencia) para controllers (plan §5, F8-ámbito).
 *
 * El middleware `permiso` controla *qué acción* puede hacer un rol; este trait
 * controla *sobre qué dependencia*. Un servidor/delegado de la dependencia A no
 * puede leer ni escribir datos de la dependencia B pasando otro `dependencia_id`;
 * un rol consolidador alcanza su dependencia y su subárbol; los roles de visión
 * institucional (admin/ETTS/ETTE) no quedan acotados.
 */
trait AutorizaAmbito
{
    /**
     * Exige que el usuario pueda operar sobre la dependencia dada. Lanza 403
     * (envuelto en el formato ApiResponse) si está fuera de su ámbito.
     */
    protected function autorizarDependencia(User $usuario, int $dependenciaId): void
    {
        if (! $usuario->puedeAccederDependencia($dependenciaId)) {
            throw new HttpResponseException(
                ApiResponse::error('La dependencia solicitada está fuera de su ámbito.', 403)
            );
        }
    }

    /**
     * Filtro de ámbito para listados: devuelve los IDs de dependencia a los que
     * el usuario tiene acceso, o `null` si su ámbito es global (sin filtro).
     *
     * @return list<int>|null
     */
    protected function idsDependenciaEnAmbito(User $usuario): ?array
    {
        return $usuario->dependenciasEnAmbito();
    }

    /**
     * Prepara los filtros de un listado de anexos acotándolos al ámbito del
     * usuario (F8): si pide una `dependencia_id` concreta, exige que esté en su
     * ámbito (403 si no); en todo caso inyecta `dependencia_ids` con el alcance
     * del usuario (o `null` si es global) para que el service lo aplique.
     *
     * @param  array<string, mixed>  $filtros
     * @return array<string, mixed>
     */
    protected function acotarFiltrosAlAmbito(User $usuario, array $filtros): array
    {
        if (! empty($filtros['dependencia_id'])) {
            $this->autorizarDependencia($usuario, (int) $filtros['dependencia_id']);
        }

        $filtros['dependencia_ids'] = $this->idsDependenciaEnAmbito($usuario);

        return $filtros;
    }
}

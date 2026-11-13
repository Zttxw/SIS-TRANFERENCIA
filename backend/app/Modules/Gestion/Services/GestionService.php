<?php

declare(strict_types=1);

namespace App\Modules\Gestion\Services;

use App\Models\User;
use App\Modules\Gestion\Models\InformeGestion;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Concerns\RespetaEstadoEntrega;
use Illuminate\Validation\ValidationException;

class GestionService
{
    use RespetaEstadoEntrega;

    /**
     * Obtiene el informe de gestión de una dependencia para el proceso activo.
     */
    public function obtenerInforme(int $dependenciaId, ?int $procesoId = null): ?InformeGestion
    {
        $procesoId = $procesoId ?? $this->resolverProcesoActivoId();

        $informe = InformeGestion::with(['dependencia', 'responsable', 'elaboradoPor', 'evidencias', 'observaciones'])
            ->where('dependencia_id', $dependenciaId)
            ->where('proceso_transferencia_id', $procesoId)
            ->first();

        $cabecera = $this->cabecera($dependenciaId, $procesoId);
        $informe ??= new InformeGestion([
            'dependencia_id' => $dependenciaId,
            'proceso_transferencia_id' => $procesoId,
        ]);
        $informe->setAttribute('cabecera', $cabecera);
        if (! $informe->servidor_responsable_id) {
            $informe->servidor_responsable_id = $cabecera['responsable']?->id;
            $informe->setRelation('responsable', $cabecera['responsable']);
        }
        $informe->nivel_organizacional ??= $cabecera['nivel_organizacional'];
        $informe->cargo_periodo ??= $cabecera['cargo'];
        $informe->setRelation('dependencia', $cabecera['dependencia']);

        return $informe;
    }

    /** @return array<string, mixed> */
    private function cabecera(int $dependenciaId, int $procesoId): array
    {
        $dependencia = Dependencia::with('encargado')->where('proceso_transferencia_id', $procesoId)->findOrFail($dependenciaId);
        $responsable = $dependencia->encargado;
        if ($responsable && $responsable->proceso_transferencia_id !== $procesoId) {
            $responsable = null;
        }

        return [
            'dependencia' => $dependencia,
            'responsable' => $responsable,
            'cargo' => $responsable?->cargo,
            'nivel_organizacional' => match ($dependencia->nivel) {
                1 => 'primer_nivel', 2 => 'segundo_nivel', 3 => 'tercer_nivel', 4 => 'equipo_trabajo',
                default => null,
            },
        ];
    }

    /**
     * Guarda o actualiza el informe de gestión (Anexo 02).
     */
    public function guardarInforme(array $datos, User $usuario, ?int $procesoId = null): InformeGestion
    {
        $procesoId = $procesoId ?? $this->resolverProcesoActivoId();

        $this->exigirEntregaModificable((int) $datos['dependencia_id'], $procesoId);

        $cabecera = $this->cabecera((int) $datos['dependencia_id'], $procesoId);
        $existente = InformeGestion::where('proceso_transferencia_id', $procesoId)
            ->where('dependencia_id', (int) $datos['dependencia_id'])->first();
        $cargo = array_key_exists('cargo_responsable', $datos)
            ? $datos['cargo_responsable']
            : ($existente?->cargo_responsable ?? $cabecera['cargo']);
        $periodo = array_key_exists('periodo_gestion', $datos)
            ? trim($datos['periodo_gestion'] ?? '')
            : $existente?->periodo_gestion;
        $cargoPeriodo = implode(' · ', array_filter([$cargo, $periodo], fn ($valor) => $valor !== null && $valor !== ''));
        if (! array_key_exists('periodo_gestion', $datos) && ! array_key_exists('cargo_responsable', $datos)) {
            $cargoPeriodo = $existente?->cargo_periodo ?? $cargoPeriodo;
        }
        if (mb_strlen($cargoPeriodo ?? '') > 255) {
            throw ValidationException::withMessages(['periodo_gestion' => 'Abrevie el periodo para que, junto al cargo, no exceda 255 caracteres.']);
        }

        return InformeGestion::updateOrCreate(
            [
                'proceso_transferencia_id' => $procesoId,
                'dependencia_id' => (int) $datos['dependencia_id'],
            ],
            [
                'servidor_responsable_id' => $cabecera['responsable']?->id,
                'elaborado_por_id' => $usuario->id,
                'nivel_organizacional' => $datos['nivel_organizacional'] ?? $existente?->nivel_organizacional ?? $cabecera['nivel_organizacional'],
                'cargo_periodo' => $cargoPeriodo,
                'responsable_nombre' => array_key_exists('responsable_nombre', $datos)
                    ? $datos['responsable_nombre'] : $existente?->responsable_nombre,
                'cargo_responsable' => $cargo,
                'periodo_gestion' => $periodo,
                'funciones' => $this->numerarFilas($datos['funciones'] ?? []),
                'logros_items' => $this->numerarFilas($datos['logros_items'] ?? []),
                'dificultades_items' => $this->numerarFilas($datos['dificultades_items'] ?? []),
                'pendientes_items' => $this->numerarFilas($datos['pendientes_items'] ?? []),
                'estado' => $datos['estado'] ?? 'borrador',
            ]
        );
    }

    /**
     * Reasigna el número de orden (`n`) de cada fila de forma secuencial (1..N),
     * preservando el orden de llegada. Devuelve null si no hay filas.
     *
     * @param  array<int, array<string, mixed>>  $filas
     * @return array<int, array<string, mixed>>|null
     */
    private function numerarFilas(array $filas): ?array
    {
        if ($filas === []) {
            return null;
        }

        $numeradas = [];
        $n = 1;
        foreach (array_values($filas) as $fila) {
            $fila['n'] = $n++;
            $numeradas[] = $fila;
        }

        return $numeradas;
    }

    private function resolverProcesoActivoId(): int
    {
        return (int) (ProcesoTransferencia::where('estado', 'abierto')->value('id') ?? 1);
    }
}

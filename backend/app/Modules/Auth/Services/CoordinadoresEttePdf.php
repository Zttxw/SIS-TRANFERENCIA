<?php

declare(strict_types=1);

namespace App\Modules\Auth\Services;

use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use Illuminate\Support\Carbon;

/**
 * Modelos de vista de los PDF de coordinadores ETTE: relación de acreditados
 * (RF-13) y constancia de reemplazo (RF-15).
 */
class CoordinadoresEttePdf
{
    public function __construct(private readonly DelegadoService $delegados) {}

    /** @return array<string, mixed> */
    public function relacion(): array
    {
        $procesoId = (int) (ProcesoTransferencia::where('estado', 'abierto')->value('id') ?? 1);
        $designaciones = $this->delegados->listar($procesoId)
            ->sortBy(fn (AsignacionRol $a): string => (string) $a->dependencia?->codigo, SORT_NATURAL)->values();

        $filas = $designaciones->map(fn (AsignacionRol $a): array => [
            'codigo' => $a->dependencia?->codigo,
            'centro_costo' => $a->dependencia?->nombre,
            'nombre' => $a->usuario?->name,
            'dni' => $a->usuario?->dni,
            'correo' => $a->usuario?->email,
            'celular' => $a->usuario?->celular,
            'acreditado_en' => $a->acreditada_en?->format('d/m/Y'),
        ])->all();

        $sinCoordinador = Dependencia::query()->centrosCosto()->where('activa', true)
            ->where('proceso_transferencia_id', $procesoId)
            ->whereNotIn('id', $designaciones->pluck('dependencia_id'))
            ->get(['codigo'])->pluck('codigo')->sort(SORT_NATURAL)->values()->all();

        return [
            'contexto' => $this->contexto('Relación institucional'),
            'filas' => $filas,
            'sinCoordinador' => $sinCoordinador,
        ];
    }

    /** @return array<string, mixed> */
    public function constancia(AsignacionRol $nueva): array
    {
        $anterior = $nueva->reemplazaA;

        return [
            'contexto' => $this->contexto((string) $nueva->dependencia?->nombre, (string) $nueva->dependencia?->codigo),
            'constancia' => [
                'centro_costo' => $nueva->dependencia?->codigo.' · '.$nueva->dependencia?->nombre,
                'anterior' => [
                    'nombre' => $anterior?->usuario?->name,
                    'dni' => $anterior?->usuario?->dni,
                    'acreditado_en' => $anterior?->acreditada_en?->format('d/m/Y H:i'),
                ],
                'nuevo' => ['nombre' => $nueva->usuario?->name, 'dni' => $nueva->usuario?->dni],
                'fecha' => $nueva->acreditada_en?->format('d/m/Y H:i'),
                'motivo' => $nueva->motivo_reemplazo,
                'registrado_por' => $nueva->acreditadaPor?->name,
            ],
        ];
    }

    /** @return array<string, mixed> */
    private function contexto(string $nombre, string $codigo = ''): array
    {
        return [
            'dependencia' => ['codigo' => $codigo, 'nombre' => $nombre],
            'emitido_en' => Carbon::now()->format('d/m/Y H:i'),
            'es_borrador' => false,
        ];
    }
}

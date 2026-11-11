<?php

declare(strict_types=1);

namespace App\Support\Enums;

/**
 * Estado administrativo de una actividad del cronograma (RF-007, C-03).
 *
 * Es el estado *declarado* por quien administra el cronograma, independiente de
 * si la fecha venció o no. La vigencia temporal (vencida respecto de hoy) se
 * deriva de las fechas, no de este enum: completar una actividad y cumplirla a
 * tiempo son hechos distintos (criterio RF-007).
 */
enum EstadoActividadCronograma: string
{
    case PENDIENTE = 'pendiente';
    case EN_CURSO = 'en_curso';
    case COMPLETADA = 'completada';

    public function etiqueta(): string
    {
        return match ($this) {
            self::PENDIENTE => 'Pendiente',
            self::EN_CURSO => 'En curso',
            self::COMPLETADA => 'Completada',
        };
    }

    /** Una actividad completada ya no participa del bloqueo por vencimiento. */
    public function estaCompletada(): bool
    {
        return $this === self::COMPLETADA;
    }
}

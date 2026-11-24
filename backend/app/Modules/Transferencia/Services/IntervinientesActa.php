<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Services;

use App\Models\User;
use App\Modules\Auth\Services\CoordinacionEtte;
use App\Modules\Organization\Models\Dependencia;
use App\Support\Enums\CalidadEtte;
use App\Support\Enums\Rol;

/**
 * Quiénes figuran en las secciones I y II del Acta 07 (RF-61, RF-64, D-03):
 *
 * - Entrega: el responsable del centro de costo.
 * - Recepción y verificación: el firmante designado del lado ETTE (el
 *   coordinador vigente o el titular ETTE que lo suple), el mismo que firma
 *   presencialmente. Ya no existe el "CC receptor".
 */
class IntervinientesActa
{
    public function __construct(private readonly CoordinacionEtte $coordinacion) {}

    /** @return array{nombre: string, dni: string, cargo: string} */
    public function entrega(Dependencia $dependencia): array
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

    /** @return array{nombre: string, dni: string, cargo: string, calidad: string} */
    public function recepcion(Dependencia $dependencia): array
    {
        $ette = $this->coordinacion->firmanteDe($dependencia->id);

        return $ette !== null
            ? $this->identidad($ette['usuario'], $ette['en_calidad_de'])
            : ['nombre' => '', 'dni' => '', 'cargo' => '', 'calidad' => self::calidad(CalidadEtte::COORDINADOR)];
    }

    /** Rol del receptor tal como lo pide el formato del Anexo 07. */
    public static function calidad(CalidadEtte $calidad): string
    {
        return $calidad === CalidadEtte::COORDINADOR
            ? 'Coordinador acreditado por el ETTE'
            : $calidad->etiqueta();
    }

    /** @return array{nombre: string, dni: string, cargo: string, calidad: string} */
    private function identidad(User $usuario, CalidadEtte $calidad): array
    {
        return [
            'nombre' => (string) $usuario->name,
            'dni' => (string) $usuario->dni,
            'cargo' => (string) ($usuario->servidor?->cargo ?? ''),
            'calidad' => self::calidad($calidad),
        ];
    }
}

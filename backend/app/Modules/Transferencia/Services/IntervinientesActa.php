<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Services;

use App\Models\User;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\Entrega;
use App\Support\Enums\CalidadEtte;
use App\Support\Enums\Rol;

/**
 * Quiénes figuran en las secciones I y II del Acta 07 (RF-61, RF-64, D-03):
 *
 * - Entrega: el responsable del centro de costo.
 * - Recepción y verificación: quien aceptó la entrega por el lado ETTE (el
 *   coordinador o un titular ETTE en suplencia); antes de la aceptación, el
 *   coordinador ETTE acreditado para el CC. Ya no existe el "CC receptor".
 */
class IntervinientesActa
{
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
    public function recepcion(Dependencia $dependencia, ?Entrega $entrega): array
    {
        $verificador = $entrega?->verificada_por_id ? User::find($entrega->verificada_por_id) : null;
        if ($verificador !== null) {
            return $this->identidad($verificador, $entrega->verificada_en_calidad_de ?? CalidadEtte::COORDINADOR);
        }

        $coordinador = AsignacionRol::query()->with('usuario.servidor')
            ->where('rol', Rol::DELEGADO_ETTE->value)
            ->where('proceso_transferencia_id', $dependencia->proceso_transferencia_id)
            ->where('dependencia_id', $dependencia->id)
            ->latest('id')->first()?->usuario;

        return $coordinador !== null
            ? $this->identidad($coordinador, CalidadEtte::COORDINADOR)
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

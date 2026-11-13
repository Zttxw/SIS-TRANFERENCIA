<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Services;

use App\Models\User;
use App\Support\Services\ContextoTransferencia;
use App\Support\Services\PdfService;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * PDF oficial del Anexo 07 (Acta de Transferencia). Unifica la impresión del
 * acta al generador del backend (F5): reutiliza TransferenciaService::obtenerActa.
 *
 * B3 (D-06): el acta se emite ANTES de remitir, por lo que su PDF puede
 * descargarse en la versión de suscripción de la hija (pre-remisión) y también
 * tras consolidar. La declaración del acta (`declara`) fija qué afirma según el
 * momento; no se exige CONSOLIDADA para imprimirla.
 *
 * @var array<string, string> MESES
 */
class ActaPdf
{
    private const MESES = [
        1 => 'enero', 2 => 'febrero', 3 => 'marzo', 4 => 'abril', 5 => 'mayo', 6 => 'junio',
        7 => 'julio', 8 => 'agosto', 9 => 'septiembre', 10 => 'octubre', 11 => 'noviembre', 12 => 'diciembre',
    ];

    /** Denominación oficial de cada anexo en la sección III del acta. */
    private const ANEXOS = [
        'anexo_02' => 'Anexo N° 02 — Informe de Gestión',
        'anexo_03' => 'Anexo N° 03 — Registro del Acervo Documentario',
        'anexo_04' => 'Anexo N° 04 — Registro de Bienes Patrimoniales',
        'anexo_05' => 'Anexo N° 05 — Información del Personal a cargo del Centro de Costo',
        'anexo_06' => 'Anexo N° 06 — Bienes No Patrimoniales',
    ];

    public function __construct(
        private readonly TransferenciaService $transferenciaService,
        private readonly ContextoTransferencia $contexto,
        private readonly PdfService $pdf,
    ) {}

    public function descargar(int $dependenciaId, User $usuario): StreamedResponse
    {
        $datos = $this->datos($dependenciaId, $usuario);
        $codigo = str_replace('.', '', (string) ($datos['contexto']['dependencia']['codigo'] ?? 's-c'));

        return $this->pdf->descargar('pdf.acta', $datos, "Anexo07-Acta-{$codigo}.pdf");
    }

    /** @return array<string, mixed> */
    public function datos(int $dependenciaId, User $usuario): array
    {
        // Materializa/actualiza el acta en su declaración vigente (suscripción de
        // la hija antes de remitir; recepción/consolidación tras consolidar).
        $acta = $this->transferenciaService->obtenerActa($dependenciaId, $usuario);
        $contexto = $this->contexto->paraDependencia($dependenciaId);

        $fecha = $acta->fecha_acta ?? Carbon::now();
        $intervinientes = $acta->intervinientes ?? [];

        return [
            'contexto' => $contexto,
            'acta' => [
                'version' => $acta->version,
                'declara' => $acta->declara->etiqueta(),
                'numero_acta' => $acta->numero_acta ?? '',
                'dependencia' => $acta->dependencia?->nombre ?? '',
                'nivel' => $acta->dependencia?->nivel ?? '',
                'unidad_superior' => $acta->dependencia?->parent_id
                    ? ($acta->dependencia?->padre?->nombre ?? 'Unidad orgánica inmediata superior')
                    : 'Alcaldía / ETTS institucional',
                'dia' => $fecha->day,
                'mes' => self::MESES[$fecha->month] ?? '',
                'anio' => $fecha->year,
                'entrega' => $this->interviniente($intervinientes, 'titular_saliente'),
                'recepcion' => $this->interviniente($intervinientes, 'titular_entrante', 'coordinador_ette', 'responsable_superior'),
                'anexos' => $this->anexos($acta->anexos_entregados ?? []),
                'observaciones' => $acta->observaciones,
            ],
        ];

    }

    /**
     * Normaliza un interviniente del acta a nombre/DNI/cargo. El jsonb admite
     * tanto un string plano (nombre) como un objeto; aquí se soportan ambos.
     *
     * @param  array<string, mixed>  $intervinientes
     * @return array{nombre: string, dni: string, cargo: string}
     */
    private function interviniente(array $intervinientes, string ...$claves): array
    {
        foreach ($claves as $clave) {
            $valor = $intervinientes[$clave] ?? null;
            if ($valor === null) {
                continue;
            }
            if (is_string($valor)) {
                return ['nombre' => $valor, 'dni' => '', 'cargo' => ''];
            }
            if (is_array($valor)) {
                return [
                    'nombre' => (string) ($valor['nombre'] ?? $valor['nombres'] ?? ''),
                    'dni' => (string) ($valor['dni'] ?? ''),
                    'cargo' => (string) ($valor['cargo'] ?? ''),
                ];
            }
        }

        return ['nombre' => '', 'dni' => '', 'cargo' => ''];
    }

    /**
     * @param  array<string, bool>  $entregados
     * @return list<array{nombre: string, entregado: bool}>
     */
    private function anexos(array $entregados): array
    {
        $filas = [];
        foreach (self::ANEXOS as $clave => $nombre) {
            $filas[] = ['nombre' => $nombre, 'entregado' => (bool) ($entregados[$clave] ?? false)];
        }

        return $filas;
    }
}

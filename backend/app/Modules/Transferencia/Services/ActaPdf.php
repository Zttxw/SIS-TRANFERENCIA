<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Services;

use App\Models\User;
use App\Support\Enums\CalidadEtte;
use App\Support\Services\ContextoTransferencia;
use App\Support\Services\PdfService;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * PDF oficial del Anexo 07 (Acta de Transferencia Administrativa y Entrega de
 * Cargo) conforme al formato de la directiva (fase 8): cabecera con el CC, su
 * clasificación y nivel del Anexo 01 y el CC del que depende; apertura con
 * lugar, fecha y hora; intervinientes; condición de cada documento;
 * observaciones del coordinador ETTE y la nota de que no sustituye el acta de
 * la CGR (RF-67).
 */
class ActaPdf
{
    private const MESES = [
        1 => 'enero', 2 => 'febrero', 3 => 'marzo', 4 => 'abril', 5 => 'mayo', 6 => 'junio',
        7 => 'julio', 8 => 'agosto', 9 => 'septiembre', 10 => 'octubre', 11 => 'noviembre', 12 => 'diciembre',
    ];

    public function __construct(
        private readonly ActaTransferenciaService $actas,
        private readonly CondicionesActa $condiciones,
        private readonly ObservacionesActa $observaciones,
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
        $acta = $this->actas->obtener($dependenciaId, $usuario);
        $dependencia = $acta->dependencia;
        $fecha = $acta->fecha_acta ?? Carbon::now();
        $intervinientes = $acta->intervinientes ?? [];

        return [
            'contexto' => $this->contexto->paraDependencia($dependenciaId),
            'acta' => [
                'version' => $acta->version,
                'numero_acta' => $acta->numero_acta ?? '',
                'codigo' => $dependencia?->codigo ?? '',
                'dependencia' => $dependencia?->nombre ?? '',
                'nivel' => (int) ($dependencia?->nivel ?? 0),
                'unidad_superior' => $dependencia?->padre?->nombre,
                'unidad_superior_codigo' => $dependencia?->padre?->codigo,
                'lugar' => $acta->lugar ?: ActaTransferenciaService::LUGAR_POR_DEFECTO,
                'dia' => $fecha->day,
                'mes' => self::MESES[$fecha->month] ?? '',
                'anio' => $fecha->year,
                'hora' => $acta->hora ? substr((string) $acta->hora, 0, 5) : null,
                'entrega' => $this->interviniente($intervinientes['titular_saliente'] ?? null),
                'recepcion' => [
                    ...$this->interviniente($intervinientes['coordinador_ette'] ?? null),
                    'calidad' => (string) ($intervinientes['coordinador_ette']['calidad'] ?? IntervinientesActa::calidad(CalidadEtte::COORDINADOR)),
                ],
                'anexos' => $this->condiciones->filas($acta->anexos_entregados ?? []),
                'otros_documentos' => $acta->otros_documentos,
                'observaciones' => $this->observaciones->delCentro($acta->dependencia_id, $acta->proceso_transferencia_id),
                'comentarios' => $acta->observaciones,
            ],
        ];
    }

    /**
     * Normaliza un interviniente a nombre, DNI y cargo. El JSON admite un
     * nombre plano o un objeto.
     *
     * @return array{nombre: string, dni: string, cargo: string}
     */
    private function interviniente(mixed $valor): array
    {
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

        return ['nombre' => '', 'dni' => '', 'cargo' => ''];
    }
}

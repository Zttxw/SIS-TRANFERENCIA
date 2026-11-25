<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Services;

use App\Models\User;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\ActaTransferencia;
use App\Modules\Transferencia\Models\Entrega;
use App\Support\Enums\AccionPlazo;
use App\Support\Enums\EstadoEntrega;
use App\Support\Services\ContextoTransferencia;

/**
 * Suscripción de la entrega de un CC (D-05, plan §3.1): con la entrega cerrada
 * para revisión, los anexos 02 al 07 se firman en la sesión del responsable
 * (el coordinador ETTE, presencialmente: firmar es aprobar) y, cuando todos
 * tienen firma vigente de ambos lados en una misma cadena, el acta queda
 * `suscrita` y la entrega pasa a `acta_suscrita`, lista para remitir.
 */
class SuscripcionEntrega
{
    /** El acervo se firma en dos documentos: 03-A (físico) y 03-B (digital SGD). */
    public const DOCUMENTOS = ['anexo02', 'anexo03a', 'anexo03b', 'anexo04', 'anexo05', 'anexo06', 'anexo07'];

    /** Anexos que el Acta 07 encadena en su huella (todos menos ella misma). */
    public const ANEXOS_DEL_ACTA = ['anexo02', 'anexo03a', 'anexo03b', 'anexo04', 'anexo05', 'anexo06'];

    public function __construct(
        private readonly CadenaFirmas $cadena,
        private readonly CadenaEttsEtte $cadenaInstitucional,
        private readonly ContextoTransferencia $contexto,
        private readonly CronogramaService $cronograma,
    ) {}

    /** Nombre legible de un tipo de documento, p. ej. «anexo03a» → «Anexo 03-A». */
    public static function etiqueta(string $tipo): string
    {
        if (preg_match('/^anexo(\d{2})([ab]?)$/', $tipo, $partes) !== 1) {
            return $tipo;
        }

        return 'Anexo '.$partes[1].($partes[2] !== '' ? '-'.strtoupper($partes[2]) : '');
    }

    /**
     * Firmas que faltan por documento y por lado.
     *
     * @return array{puede_remitir: bool, firmados: int, pendientes: list<string>,
     *     documentos: array<string, array{completo: bool, sesion_final_id: ?string, firmado_path: ?string,
     *     hay_firma_digital: bool, entidad: ?array<string, mixed>, ette: ?array<string, mixed>}>}
     */
    public function requisitosRemision(int $dependenciaId, User $usuario): array
    {
        $procesoId = Dependencia::findOrFail($dependenciaId)->proceso_transferencia_id;
        $documentos = [];
        foreach (self::DOCUMENTOS as $tipo) {
            $documentos[$tipo] = $this->cadena->estado($procesoId, $dependenciaId, $tipo, $usuario);
        }
        $pendientes = array_keys(array_filter($documentos, fn (array $estado): bool => ! $estado['completo']));

        return ['puede_remitir' => $pendientes === [], 'firmados' => count(self::DOCUMENTOS) - count($pendientes),
            'pendientes' => $pendientes, 'documentos' => $documentos];
    }

    /** El Anexo 01 institucional (sin CC) se habilita al cierre de la cadena ETTS → ETTE. */
    public function firmaHabilitada(?int $dependenciaId): bool
    {
        return $dependenciaId === null
            ? $this->cadenaInstitucional->cadenaCompleta($this->contexto->procesoActivoId())
            : $this->estadoEntrega($dependenciaId)->admiteFirma();
    }

    /**
     * Solo se firma con la entrega cerrada para revisión (D-07) y mientras el
     * plazo de la suscripción del acta siga vigente (D-12); el Anexo 01, cuando
     * el ETTE recibió todas las entregas del ETTS.
     */
    public function exigirFirmaHabilitada(?int $dependenciaId): void
    {
        if ($dependenciaId === null) {
            abort_unless($this->firmaHabilitada(null), 409,
                'El Anexo 01 se firma al cierre: cuando el ETTE haya recibido las entregas de todos los centros de costo que envían al ETTS.');

            return;
        }
        $estado = $this->estadoEntrega($dependenciaId);
        abort_unless($estado->admiteFirma(), 409, $estado->fueRemitida()
            ? 'La entrega ya fue remitida.'
            : 'La firma se habilita cuando el responsable cierra la entrega para revisión y firma (estado actual: "'.$estado->etiqueta().'").');
        $this->cronograma->exigirPlazoVigente($this->contexto->procesoActivoId(), $dependenciaId, AccionPlazo::FIRMAR);
    }

    /**
     * Refleja las firmas vigentes en el acta (suscrita o generada) y en la
     * entrega (acta_suscrita o en_revision). Se invoca tras registrar una firma.
     */
    public function sincronizar(Dependencia $dependencia, User $usuario): void
    {
        $requisitos = $this->requisitosRemision($dependencia->id, $usuario);

        $acta = ActaTransferencia::where('proceso_transferencia_id', $dependencia->proceso_transferencia_id)
            ->where('dependencia_id', $dependencia->id)->first();
        $actaFirmada = $requisitos['documentos']['anexo07'];
        if ($acta && $actaFirmada['completo']) {
            $acta->update(['estado' => 'suscrita', 'ruta_pdf_suscrito' => $actaFirmada['firmado_path']]);
        } elseif ($acta?->estado === 'suscrita') {
            $acta->update(['estado' => 'generada', 'ruta_pdf_suscrito' => null]);
        }

        $entrega = $this->entrega($dependencia);
        $nuevo = match (true) {
            $entrega?->estado === EstadoEntrega::EN_REVISION && $requisitos['puede_remitir'] => EstadoEntrega::ACTA_SUSCRITA,
            $entrega?->estado === EstadoEntrega::ACTA_SUSCRITA && ! $requisitos['puede_remitir'] => EstadoEntrega::EN_REVISION,
            default => null,
        };
        if ($nuevo !== null) {
            $entrega->update(['estado' => $nuevo]);
        }
    }

    private function estadoEntrega(int $dependenciaId): EstadoEntrega
    {
        return $this->entrega(Dependencia::findOrFail($dependenciaId))?->estado ?? EstadoEntrega::BORRADOR;
    }

    private function entrega(Dependencia $dependencia): ?Entrega
    {
        return Entrega::where('proceso_transferencia_id', $dependencia->proceso_transferencia_id)
            ->where('dependencia_id', $dependencia->id)->first();
    }
}

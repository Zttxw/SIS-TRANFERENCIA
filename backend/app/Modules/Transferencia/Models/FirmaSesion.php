<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Models;

use App\Support\Enums\CalidadEtte;
use App\Support\Enums\LadoFirma;
use Database\Factories\FirmaSesionFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Sesión de firma de un documento: digital (applet Firma Perú) o el escaneo
 * con firma manuscrita del lado ETTE (`origen = manual`). `documento_previo_id`
 * enlaza la sesión con la firma sobre la que se agrega (cadena, D-06).
 *
 * `usuario_id` y `firmante_dni` son del firmante (el certificado debe ser
 * suyo); `operador_id`, de quien operaba la sesión: el responsable del CC
 * cuando firma presencialmente el coordinador ETTE o el titular suplente.
 *
 * @property LadoFirma $lado
 * @property ?CalidadEtte $en_calidad_de
 * @property ?string $motivo_suplencia
 */
class FirmaSesion extends Model
{
    /** @use HasFactory<FirmaSesionFactory> */
    use HasFactory, HasUuids;

    protected $table = 'firma_sesiones';

    protected $guarded = [];

    protected $hidden = ['param_token_hash', 'document_token_hash', 'upload_token_hash', 'pdf_path', 'firmado_path'];

    protected function casts(): array
    {
        return ['expires_at' => 'datetime', 'firmado_en' => 'datetime', 'detalles' => 'array',
            'lado' => LadoFirma::class, 'en_calidad_de' => CalidadEtte::class];
    }

    protected static function newFactory(): FirmaSesionFactory
    {
        return FirmaSesionFactory::new();
    }

    public function expirada(): bool
    {
        return now()->greaterThanOrEqualTo($this->expires_at);
    }

    public function documento(): BelongsTo
    {
        return $this->belongsTo(DocumentoFirma::class, 'documento_firma_id');
    }
}

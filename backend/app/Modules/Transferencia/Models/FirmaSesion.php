<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Models;

use Database\Factories\FirmaSesionFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FirmaSesion extends Model
{
    /** @use HasFactory<FirmaSesionFactory> */
    use HasFactory, HasUuids;

    protected $table = 'firma_sesiones';

    protected $guarded = [];

    protected $hidden = ['param_token_hash', 'document_token_hash', 'upload_token_hash', 'pdf_path', 'firmado_path'];

    protected function casts(): array
    {
        return ['expires_at' => 'datetime', 'firmado_en' => 'datetime', 'detalles' => 'array'];
    }

    protected static function newFactory(): FirmaSesionFactory
    {
        return FirmaSesionFactory::new();
    }

    public function expirada(): bool
    {
        return now()->greaterThanOrEqualTo($this->expires_at);
    }
}

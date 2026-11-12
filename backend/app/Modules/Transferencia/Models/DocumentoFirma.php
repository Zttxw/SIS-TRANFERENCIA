<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Models;

use Database\Factories\DocumentoFirmaFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DocumentoFirma extends Model
{
    /** @use HasFactory<DocumentoFirmaFactory> */
    use HasFactory;

    protected $table = 'documentos_firma';

    protected $guarded = [];

    protected function casts(): array
    {
        return ['version' => 'integer'];
    }

    protected static function newFactory(): DocumentoFirmaFactory
    {
        return DocumentoFirmaFactory::new();
    }
}

<?php

declare(strict_types=1);

namespace App\Support\Services;

use App\Models\User;
use App\Support\Models\Evidencia;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class EvidenciaService
{
    /**
     * Sube y registra un archivo en el almacenamiento seguro vinculado polimórficamente.
     */
    public function subir(
        UploadedFile $archivo,
        string $tipoModelo,
        int $modeloId,
        User $usuario,
        ?string $descripcion = null
    ): Evidencia {
        $hash = hash_file('sha256', $archivo->getRealPath());
        $subcarpeta = strtolower(class_basename($tipoModelo));
        $nombreUnico = uniqid("evid_{$subcarpeta}_").'.'.$archivo->getClientOriginalExtension();

        $ruta = $archivo->storeAs($subcarpeta, $nombreUnico, 'secure');

        return Evidencia::create([
            'evidenciable_type' => $tipoModelo,
            'evidenciable_id' => $modeloId,
            'subido_por_id' => $usuario->id,
            'nombre_original' => $archivo->getClientOriginalName(),
            'disco' => 'secure',
            'ruta' => $ruta,
            'mime_type' => $archivo->getMimeType() ?: 'application/octet-stream',
            'tamano_bytes' => $archivo->getSize(),
            'hash' => $hash,
            'descripcion' => $descripcion,
        ]);
    }

    /**
     * Descarga de forma segura un archivo de evidencia comprobando permisos.
     */
    public function descargar(int $id): StreamedResponse
    {
        $evidencia = Evidencia::findOrFail($id);

        if (! Storage::disk('secure')->exists($evidencia->ruta)) {
            abort(404, 'El archivo físico de evidencia no se encuentra en el almacenamiento seguro.');
        }

        return Storage::disk('secure')->download(
            $evidencia->ruta,
            $evidencia->nombre_original,
            ['Content-Type' => $evidencia->mime_type]
        );
    }
}

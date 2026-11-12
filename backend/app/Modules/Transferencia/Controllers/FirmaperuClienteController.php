<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class FirmaperuClienteController extends Controller
{
    private const ORIGEN = 'https://resources.firmaperu.gob.pe/app/clickonce/clienteweb/';

    /** Entrega bytes oficiales intactos: ClickOnce verifica los manifiestos y sus archivos. */
    public function archivo(string $archivo): Response
    {
        $archivo = str_replace('\\', '/', $archivo);
        $esInicio = $archivo === 'FirmaPeruWeb.application';
        abort_unless(strlen($archivo) <= 400 && ($esInicio || preg_match(
            '#\AApplication Files/FirmaPeruWeb_\d+(?:_\d+){3}/[A-Za-z0-9_./ -]+\.(?:manifest|deploy|exe|dll|jar|config|ico)\z#', $archivo)), 404);
        foreach (explode('/', $archivo) as $segmento) {
            abort_if(in_array($segmento, ['', '.', '..'], true), 404);
        }

        $disk = Storage::disk('local');
        $cache = 'firmaperu-cliente-cache/'.hash('sha256', $archivo);
        $vigencia = $esInicio ? 300 : 86400;
        if (! $disk->exists($cache) || now()->timestamp - $disk->lastModified($cache) >= $vigencia) {
            $url = self::ORIGEN.implode('/', array_map('rawurlencode', explode('/', $archivo)));
            try {
                $respuesta = Http::connectTimeout(5)->timeout(45)->withoutRedirecting()->get($url);
            } catch (ConnectionException) {
                abort(502, 'No se pudo contactar con el proveedor oficial del cliente Firma Perú.');
            }
            abort_if($respuesta->status() === 404, 404, 'El proveedor no tiene disponible este archivo del cliente.');
            abort_unless($respuesta->successful(), 502, 'El proveedor no pudo entregar el cliente Firma Perú.');
            $contenido = $respuesta->body();
            abort_if($contenido === '' || strlen($contenido) > 67108864, 502, 'El proveedor devolvió un archivo vacío o demasiado grande.');
            $temporal = $cache.'.'.Str::random(16).'.tmp';
            try {
                abort_unless($disk->put($temporal, $contenido) && $disk->move($temporal, $cache), 503,
                    'No se pudo conservar el cliente oficial. Intente nuevamente.');
            } finally {
                $disk->delete($temporal);
            }
        }

        $tipo = $esInicio ? 'application/x-ms-application'
            : (str_ends_with($archivo, '.manifest') ? 'application/x-ms-manifest' : 'application/octet-stream');

        return response($disk->get($cache), 200, [
            'Content-Type' => $tipo,
            'Content-Disposition' => 'inline; filename="'.basename($archivo).'"',
            'Cache-Control' => 'public, max-age='.$vigencia,
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}

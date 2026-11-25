{{-- Plantilla base de los PDF oficiales de anexos (F5). Formato de la directiva
     interna de Transferencia Administrativa de la MDSJ. El contenido de cada anexo
     se inyecta en la sección @yield('cuerpo').

     Diseño: sobrio, profesional, escala de grises. El espaciado es consistente
     (una sola escala vertical) y las tablas no se parten a mitad de fila entre
     páginas. La cabecera/pie van fijos y su alto está cuadrado con los márgenes
     de @page para que el cuerpo no quede desplazado. --}}
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <style>
        /* Margen superior = alto de la cabecera (62px) + aire (10px) + desfase
           superior (12px). Inferior = alto del pie (26px) + aire. Si cambia la
           cabecera, ajustar juntos este margen y `header { top }`. */
        @page {
            margin: 84px 36px 48px 36px;
        }

        * {
            font-family: 'DejaVu Sans', sans-serif;
            box-sizing: border-box;
        }

        body {
            font-size: 9px;
            line-height: 1.35;
            color: #1a1a1a;
            margin: 0;
        }

        /* ---- Cabecera institucional fija (alto fijo: 62px) ----
           Escudo a la izquierda, títulos centrados y una columna vacía del mismo
           ancho que el escudo a la derecha para que el centrado sea exacto. */
        header {
            position: fixed;
            top: -72px;
            left: 0;
            right: 0;
            height: 62px;
        }

        header table.marca {
            margin: 0;
            border-bottom: 1.5px solid #1a1a1a;
        }

        header .marca td {
            border: none;
            padding: 0 0 4px 0;
            vertical-align: middle;
            text-align: center;
        }

        header .marca td.escudo,
        header .marca td.contrapeso {
            width: 58px;
        }

        header .marca td.escudo { text-align: left; }

        header .marca img {
            height: 48px;
        }

        /* Filete fino bajo la línea gruesa: doble filete institucional. */
        header .filete {
            border-top: 0.5px solid #1a1a1a;
            margin-top: 1.5px;
        }

        header .entidad {
            font-size: 11px;
            font-weight: bold;
            color: #1a1a1a;
            text-transform: uppercase;
            letter-spacing: 0.6px;
        }

        header .subtitulo {
            font-size: 7px;
            color: #595959;
            margin-top: 1px;
        }

        header .anexo-titulo {
            margin-top: 4px;
            font-size: 10.5px;
            font-weight: bold;
            color: #1a1a1a;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }

        /* ---- Pie fijo (alto fijo: 26px). El número de página «Pág. X / Y» lo
           dibuja PdfService::binario() en el hueco derecho: el contador CSS
           counter(pages) no funciona en dompdf. ---- */
        footer {
            position: fixed;
            bottom: -34px;
            left: 0;
            right: 0;
            height: 26px;
            font-size: 7px;
            color: #737373;
            border-top: 0.75px solid #bfbfbf;
            padding-top: 4px;
        }

        footer .izq { position: absolute; left: 0; width: 50%; }
        /* Deja libres 60px a la derecha para «Pág. X / Y» (PdfService). */
        footer .der { position: absolute; right: 60px; width: 40%; text-align: right; }

        /* ---- Marca de agua para borradores ---- */
        .watermark {
            position: fixed;
            top: 42%;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 96px;
            font-weight: bold;
            color: #000000;
            opacity: 0.05;
            transform: rotate(-30deg);
            z-index: -1;
            letter-spacing: 6px;
        }

        /* ---- Tablas ---- */
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 0 0 9px 0;
        }

        /* Las filas no se cortan entre páginas; la cabecera de la tabla se
           repite al continuar en la página siguiente. */
        tr { page-break-inside: avoid; }
        thead { display: table-header-group; }

        th, td {
            border: 0.5px solid #808080;
            padding: 3px 5px;
            vertical-align: top;
            text-align: left;
            line-height: 1.3;
            word-wrap: break-word;
        }

        th {
            background-color: #ececec;
            color: #1a1a1a;
            font-weight: bold;
            font-size: 8px;
            text-transform: uppercase;
            letter-spacing: 0.2px;
        }

        /* ---- Título de sección: sobrio, gris, sin romper página tras él ---- */
        .seccion-titulo {
            background-color: #333333;
            color: #ffffff;
            font-weight: bold;
            font-size: 8.5px;
            padding: 4px 7px;
            margin: 11px 0 5px 0;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            page-break-after: avoid;
        }

        /* El primer título de sección no necesita separación superior. */
        main > .seccion-titulo:first-child { margin-top: 0; }

        .etiqueta {
            background-color: #f2f2f2;
            font-weight: bold;
            width: 38%;
        }

        .celda-n { text-align: center; width: 26px; }
        .vacio { color: #8c8c8c; font-style: italic; }
        .mono { font-family: 'DejaVu Sans Mono', monospace; }
        .nowrap { white-space: nowrap; }

        /* ---- Bloque de firma: proporcionado y nunca partido ---- */
        .firma-bloque {
            margin-top: 28px;
            width: 100%;
            page-break-inside: avoid;
        }

        .firma-bloque td {
            border: none;
            text-align: center;
            padding-top: 60px;
            font-size: 8px;
            width: 50%;
        }

        .firma-linea {
            border-top: 0.75px solid #1a1a1a;
            margin: 0 22px;
            padding-top: 3px;
        }

        .declaracion {
            font-size: 8px;
            text-align: justify;
            margin: 8px 0;
            color: #333333;
        }

        /* Lugar y fecha de suscripción, alineados a la derecha sobre las firmas. */
        .lugar-fecha {
            text-align: right;
            margin-top: 14px;
        }

        /* Título de cada anexo embebido en el expediente consolidado. */
        .titulo-anexo-interno {
            font-size: 11px;
            font-weight: bold;
            color: #1a1a1a;
            text-transform: uppercase;
            letter-spacing: 0.2px;
            text-align: center;
            border-bottom: 1px solid #808080;
            padding-bottom: 4px;
            margin-bottom: 8px;
            page-break-after: avoid;
        }

        /* Salto de página semántico (sustituye a los <div> con estilo inline). */
        .salto-pagina { page-break-before: always; }
    </style>
</head>
<body>
    <header>
        <table class="marca">
            <tr>
                <td class="escudo">
                    <img src="{{ once(fn (): string => 'data:image/png;base64,'.base64_encode(file_get_contents(resource_path('images/logo-mdsj.png')))) }}" alt="Escudo de la Municipalidad Distrital de San Jerónimo">
                </td>
                <td>
                    <div class="entidad">Municipalidad Distrital de San Jerónimo</div>
                    <div class="subtitulo">
                        Proceso de Transferencia Administrativa de Gestión y Entrega de Cargo
                        &mdash; Directiva CGR N.° 016-2022-CG/PREVI
                    </div>
                    <div class="anexo-titulo">@yield('anexo_titulo')</div>
                </td>
                <td class="contrapeso"></td>
            </tr>
        </table>
        <div class="filete"></div>
    </header>

    <footer>
        <span class="izq">
            {{ $contexto['dependencia']['codigo'] ?? '' }} &mdash;
            {{ $contexto['dependencia']['nombre'] ?? '' }}
        </span>
        <span class="der">Emitido el {{ $contexto['emitido_en'] ?? '' }} &middot;</span>
    </footer>

    @if (($contexto['es_borrador'] ?? false))
        <div class="watermark">BORRADOR</div>
    @endif

    <main>
        @yield('cuerpo')
    </main>
</body>
</html>

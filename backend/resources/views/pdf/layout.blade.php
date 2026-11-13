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
        /* Margen superior = alto real de la cabecera (58px) + aire (10px).
           Inferior = alto del pie (26px) + aire. Así el cuerpo nunca se solapa
           ni queda empujado hacia abajo. */
        @page {
            margin: 74px 36px 48px 36px;
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

        /* ---- Cabecera institucional fija (alto fijo: 58px) ---- */
        header {
            position: fixed;
            top: -62px;
            left: 0;
            right: 0;
            height: 56px;
        }

        header .marca {
            border-bottom: 1.5px solid #333333;
            padding-bottom: 5px;
        }

        header .entidad {
            font-size: 10.5px;
            font-weight: bold;
            color: #1a1a1a;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }

        header .subtitulo {
            font-size: 7px;
            color: #595959;
            margin-top: 1px;
        }

        header .anexo-titulo {
            margin-top: 5px;
            font-size: 10.5px;
            font-weight: bold;
            color: #1a1a1a;
            text-transform: uppercase;
            letter-spacing: 0.2px;
        }

        /* ---- Pie fijo con numeración y folio (alto fijo: 26px) ---- */
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

        footer .izq { float: left; max-width: 68%; }
        footer .der { float: right; }

        footer .pagina:after {
            content: counter(page) " / " counter(pages);
        }

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
            margin-top: 22px;
            width: 100%;
            page-break-inside: avoid;
        }

        .firma-bloque td {
            border: none;
            text-align: center;
            padding-top: 30px;
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

        /* Título de cada anexo embebido en el expediente consolidado. */
        .titulo-anexo-interno {
            font-size: 11px;
            font-weight: bold;
            color: #1a1a1a;
            text-transform: uppercase;
            letter-spacing: 0.2px;
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
        <div class="marca">
            <div class="entidad">Municipalidad Distrital de San Jerónimo</div>
            <div class="subtitulo">
                Proceso de Transferencia Administrativa de Gestión y Entrega de Cargo
                &mdash; Directiva CGR N.° 016-2022-CG/PREVI
            </div>
            <div class="anexo-titulo">@yield('anexo_titulo')</div>
        </div>
    </header>

    <footer>
        <span class="izq">
            {{ $contexto['dependencia']['codigo'] ?? '' }} &mdash;
            {{ $contexto['dependencia']['nombre'] ?? '' }}
        </span>
        <span class="der">
            Emitido el {{ $contexto['emitido_en'] ?? '' }} &middot;
            Pág. <span class="pagina"></span>
        </span>
    </footer>

    @if (($contexto['es_borrador'] ?? false))
        <div class="watermark">BORRADOR</div>
    @endif

    <main>
        @yield('cuerpo')
    </main>
</body>
</html>

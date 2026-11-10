{{-- Plantilla base de los PDF oficiales de anexos (F5). Formato de la directiva
     interna de Transferencia Administrativa de la MDSJ. El contenido de cada anexo
     se inyecta en la sección @yield('cuerpo'). --}}
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <style>
        @page {
            margin: 120px 32px 70px 32px;
        }

        * {
            font-family: 'DejaVu Sans', sans-serif;
        }

        body {
            font-size: 9px;
            color: #111827;
            margin: 0;
        }

        /* Cabecera institucional fija en cada página */
        header {
            position: fixed;
            top: -96px;
            left: 0;
            right: 0;
            height: 90px;
        }

        header .marca {
            border-bottom: 2px solid #3484A5;
            padding-bottom: 6px;
        }

        header .entidad {
            font-size: 11px;
            font-weight: bold;
            color: #1f2937;
            text-transform: uppercase;
        }

        header .subtitulo {
            font-size: 8px;
            color: #4b5563;
        }

        header .anexo-titulo {
            margin-top: 8px;
            font-size: 12px;
            font-weight: bold;
            color: #3484A5;
            text-transform: uppercase;
        }

        /* Pie fijo con numeración y folio */
        footer {
            position: fixed;
            bottom: -46px;
            left: 0;
            right: 0;
            height: 40px;
            font-size: 7px;
            color: #6b7280;
            border-top: 1px solid #d1d5db;
            padding-top: 4px;
        }

        footer .izq { float: left; }
        footer .der { float: right; }

        footer .pagina:after {
            content: counter(page) " / " counter(pages);
        }

        /* Marca de agua para borradores (entrega no consolidada) */
        .watermark {
            position: fixed;
            top: 40%;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 90px;
            font-weight: bold;
            color: #000000;
            opacity: 0.06;
            transform: rotate(-30deg);
            z-index: -1;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
        }

        th, td {
            border: 0.6px solid #374151;
            padding: 3px 4px;
            vertical-align: top;
            text-align: left;
        }

        th {
            background-color: #eef2f5;
            font-weight: bold;
            font-size: 8px;
        }

        .seccion-titulo {
            background-color: #3484A5;
            color: #ffffff;
            font-weight: bold;
            font-size: 9px;
            padding: 4px 6px;
            margin: 10px 0 4px 0;
            text-transform: uppercase;
        }

        .etiqueta {
            background-color: #f3f4f6;
            font-weight: bold;
            width: 38%;
        }

        .celda-n { text-align: center; width: 24px; }
        .vacio { color: #9ca3af; font-style: italic; }
        .mono { font-family: 'DejaVu Sans Mono', monospace; }
        .nowrap { white-space: nowrap; }

        .firma-bloque {
            margin-top: 28px;
            width: 100%;
        }

        .firma-bloque td {
            border: none;
            text-align: center;
            padding-top: 40px;
            font-size: 8px;
            width: 50%;
        }

        .firma-linea {
            border-top: 0.8px solid #111827;
            margin: 0 24px;
            padding-top: 3px;
        }

        .declaracion {
            font-size: 8px;
            text-align: justify;
            margin: 10px 0;
            color: #374151;
        }
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

@extends('pdf.layout')

@section('anexo_titulo', 'Expediente de Transferencia — ' . ($contexto['dependencia']['nombre'] ?? ''))

@section('cuerpo')
    {{-- Portada / índice del expediente --}}
    <p class="declaracion">
        Expediente consolidado de la Transferencia Administrativa de Gestión y Entrega de Cargo del
        centro de costo <strong>{{ $contexto['dependencia']['nombre'] }}</strong>
        (código {{ $contexto['dependencia']['codigo'] }}). Reúne los anexos 02 al 06 y el Acta
        (Anexo 07) presentados en el Sistema Institucional de Transferencia.
    </p>

    <table>
        <thead><tr><th>Anexo</th><th>Contenido</th><th class="celda-n">Incluido</th></tr></thead>
        <tbody>
            @foreach ($indice as $item)
                <tr>
                    <td>{{ $item['anexo'] }}</td>
                    <td>{{ $item['nombre'] }}</td>
                    <td class="celda-n">{!! $item['incluido'] ? '&#9746;' : '&#9744;' !!}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    {{-- Anexo 02 --}}
    @if (isset($anexo02))
        <div style="page-break-before: always"></div>
        <div class="anexo-titulo" style="color:#3484A5;font-size:12px;font-weight:bold;margin-bottom:6px">
            Anexo 02 — Informe de Gestión
        </div>
        @include('pdf.partials.anexo02', ['informe' => $anexo02['informe'], 'nivelCheck' => $anexo02['nivelCheck']])
    @endif

    {{-- Anexo 03 --}}
    @if (isset($anexo03))
        <div style="page-break-before: always"></div>
        <div class="anexo-titulo" style="color:#3484A5;font-size:12px;font-weight:bold;margin-bottom:6px">
            Anexo 03 — Registro del Acervo Documentario
        </div>
        @include('pdf.partials.anexo03', ['cabecera' => $anexo03['cabecera'], 'grupos' => $anexo03['grupos']])
    @endif

    {{-- Anexo 04 --}}
    @if (isset($anexo04))
        <div style="page-break-before: always"></div>
        <div class="anexo-titulo" style="color:#3484A5;font-size:12px;font-weight:bold;margin-bottom:6px">
            Anexo 04 — Registro de Bienes Patrimoniales
        </div>
        @include('pdf.partials.anexo04', ['cabecera' => $anexo04['cabecera'], 'grupos' => $anexo04['grupos']])
    @endif

    {{-- Anexo 05 --}}
    @if (isset($anexo05))
        <div style="page-break-before: always"></div>
        <div class="anexo-titulo" style="color:#3484A5;font-size:12px;font-weight:bold;margin-bottom:6px">
            Anexo 05 — Información del Personal a Cargo
        </div>
        @include('pdf.partials.anexo05', ['cabecera' => $anexo05['cabecera'], 'personal' => $anexo05['personal']])
    @endif

    {{-- Anexo 06 --}}
    @if (isset($anexo06))
        <div style="page-break-before: always"></div>
        <div class="anexo-titulo" style="color:#3484A5;font-size:12px;font-weight:bold;margin-bottom:6px">
            Anexo 06 — Bienes No Patrimoniales
        </div>
        @include('pdf.partials.anexo06', ['cabecera' => $anexo06['cabecera'], 'bienes' => $anexo06['bienes']])
    @endif
@endsection

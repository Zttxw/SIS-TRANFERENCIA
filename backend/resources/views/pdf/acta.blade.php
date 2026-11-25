@extends('pdf.layout')

@section('anexo_titulo', 'Anexo 07 — Acta de Transferencia Administrativa y Entrega de Cargo')

@php
    $marca = fn (bool $marcado): string => $marcado ? '&#9746;' : '&#9744;';
@endphp

@section('cuerpo')
    <table>
        <tr>
            <td class="etiqueta">N.° de Acta</td>
            <td class="mono">{{ $acta['numero_acta'] }} (versión {{ $acta['version'] }})</td>
        </tr>
        <tr>
            <td class="etiqueta">Centro de costo</td>
            <td><span class="mono">{{ $acta['codigo'] }}</span> — {{ $acta['dependencia'] }}</td>
        </tr>
        <tr>
            <td class="etiqueta">Clasificación</td>
            <td>Centro de costo del Anexo 01 (POI registrado en CEPLAN), código {{ $acta['codigo'] }}</td>
        </tr>
        <tr>
            <td class="etiqueta">Unidad de organización de la que depende</td>
            <td>
                @if ($acta['unidad_superior'])
                    <span class="mono">{{ $acta['unidad_superior_codigo'] }}</span> — {{ $acta['unidad_superior'] }}
                @else
                    Ninguna: en el Anexo 01 el centro de costo depende de sí mismo (entrega al ETTS)
                @endif
            </td>
        </tr>
        <tr>
            <td class="etiqueta">Nivel</td>
            <td>
                @foreach ([1, 2, 3] as $nivel)
                    {!! $marca($acta['nivel'] === $nivel) !!} {{ $nivel }}&nbsp;&nbsp;
                @endforeach
            </td>
        </tr>
    </table>

    <p class="declaracion">
        En {{ $acta['lugar'] }}, a los {{ $acta['dia'] }} días del mes de {{ $acta['mes'] }} del año
        {{ $acta['anio'] }}, siendo las {{ $acta['hora'] ?? '______' }} horas, en las instalaciones de la
        Municipalidad Distrital de San Jerónimo, se reúnen los responsables que intervienen en la
        Transferencia Administrativa de Gestión y Entrega de Cargo del centro de costo señalado, en
        cumplimiento de la directiva vigente.
    </p>

    <div class="seccion-titulo">I. Responsable que efectúa la entrega</div>
    <table>
        <thead>
            <tr><th>Rol</th><th>N° DNI</th><th>Nombres y apellidos</th><th>Cargo / Puesto</th></tr>
        </thead>
        <tbody>
            <tr>
                <td>Responsable del centro de costo</td>
                <td class="mono">{{ $acta['entrega']['dni'] }}</td>
                <td>{{ $acta['entrega']['nombre'] }}</td>
                <td>{{ $acta['entrega']['cargo'] }}</td>
            </tr>
        </tbody>
    </table>

    <div class="seccion-titulo">II. Responsable de la recepción y verificación</div>
    <table>
        <thead>
            <tr><th>Rol</th><th>N° DNI</th><th>Nombres y apellidos</th><th>Cargo / Condición</th></tr>
        </thead>
        <tbody>
            <tr>
                <td>{{ $acta['recepcion']['calidad'] }}</td>
                <td class="mono">{{ $acta['recepcion']['dni'] }}</td>
                <td>{{ $acta['recepcion']['nombre'] }}</td>
                <td>{{ $acta['recepcion']['cargo'] }}</td>
            </tr>
        </tbody>
    </table>

    <div class="seccion-titulo">III. Información y documentación entregada</div>
    <table>
        <thead>
            <tr><th class="celda-n">N°</th><th>Información / documentación</th><th>Condición</th><th>Observaciones</th></tr>
        </thead>
        <tbody>
            @foreach ($acta['anexos'] as $i => $fila)
                <tr>
                    <td class="celda-n">{{ $i + 1 }}</td>
                    <td>
                        {{ $fila['nombre'] }}
                        @if ($i === count($acta['anexos']) - 1 && filled($acta['otros_documentos']))
                            <br><span class="declaracion">{{ $acta['otros_documentos'] }}</span>
                        @endif
                    </td>
                    <td>
                        {!! $marca($fila['condicion'] === 'entregado') !!} Entregado<br>
                        {!! $marca($fila['condicion'] === 'no_entregado') !!} No entregado
                        @if ($fila['admite_no_aplica'])
                            <br>{!! $marca($fila['condicion'] === 'no_aplica') !!} No aplica
                        @endif
                    </td>
                    <td>{{ $fila['observacion'] }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div class="seccion-titulo">IV. Observaciones</div>
    <table>
        <thead>
            <tr><th class="celda-n">N°</th><th>Observación</th><th>Documentación relacionada</th></tr>
        </thead>
        <tbody>
            @forelse ($acta['observaciones'] as $observacion)
                <tr>
                    <td class="celda-n">{{ $observacion['n'] }}</td>
                    <td>{{ $observacion['descripcion'] }}</td>
                    <td>{{ $observacion['documentacion'] }}</td>
                </tr>
            @empty
                <tr><td colspan="3">El coordinador ETTE no registró observaciones.</td></tr>
            @endforelse
        </tbody>
    </table>
    <p class="declaracion">
        <strong>Comentarios adicionales:</strong> {{ $acta['comentarios'] ?: 'Ninguno.' }}
    </p>

    <p class="declaracion">
        En constancia de lo señalado, los intervinientes suscriben la presente Acta de Transferencia
        Administrativa de Gestión y Entrega de Cargo.
    </p>

    @include('pdf.partials.firmas', [
        'entrega' => $acta['entrega'],
        'recepcion' => $acta['recepcion'],
        'centro' => trim($acta['codigo'].' — '.$acta['dependencia'], ' —'),
    ])

    <p class="declaracion">
        <strong>Nota:</strong> esta acta es un documento interno del procedimiento de transferencia administrativa
        de la Municipalidad y no sustituye el Acta de Transferencia de Gestión ni los formatos y entregables de la
        Contraloría General de la República.
    </p>
@endsection

@extends('pdf.layout')

@section('anexo_titulo', 'Anexo 07 — Acta de Transferencia Administrativa y Entrega de Cargo')

@section('cuerpo')
    <table>
        <tr>
            <td class="etiqueta">Versión / Declaración</td>
            <td>{{ $acta['version'] }} — {{ $acta['declara'] }}</td>
        </tr>
        <tr>
            <td class="etiqueta">N.° de Acta</td>
            <td class="mono">{{ $acta['numero_acta'] }}</td>
        </tr>
        <tr>
            <td class="etiqueta">Centro de Costo</td>
            <td>{{ $acta['dependencia'] }}</td>
        </tr>
        <tr>
            <td class="etiqueta">Clasificación / Nivel organizacional</td>
            <td>Nivel {{ $acta['nivel'] }}</td>
        </tr>
        <tr>
            <td class="etiqueta">Unidad de organización de la cual depende</td>
            <td>{{ $acta['unidad_superior'] }}</td>
        </tr>
    </table>

    <p class="declaracion">
        En el distrito de San Jerónimo de la ciudad de Cusco, a los {{ $acta['dia'] }} días del mes de
        {{ $acta['mes'] }} del año {{ $acta['anio'] }}, en las instalaciones de la Municipalidad
        Distrital de San Jerónimo, se reúnen los responsables que intervienen en la Transferencia
        Administrativa de Gestión y Entrega de Cargo del Centro de Costo señalado precedentemente, en
        cumplimiento de las disposiciones establecidas en la Directiva vigente.
    </p>

    <div class="seccion-titulo">I. Responsable que Efectúa la Entrega</div>
    <table>
        <thead>
            <tr><th>Rol</th><th>N° DNI</th><th>Nombres y apellidos</th><th>Cargo / Puesto</th></tr>
        </thead>
        <tbody>
            <tr>
                <td>Responsable del Centro de Costo</td>
                <td class="mono">{{ $acta['entrega']['dni'] }}</td>
                <td>{{ $acta['entrega']['nombre'] }}</td>
                <td>{{ $acta['entrega']['cargo'] }}</td>
            </tr>
        </tbody>
    </table>

    <div class="seccion-titulo">II. Responsable de la Recepción / Verificación</div>
    <table>
        <thead>
            <tr><th>Rol</th><th>N° DNI</th><th>Nombres y apellidos</th><th>Cargo / Condición</th></tr>
        </thead>
        <tbody>
            <tr>
                <td>Coordinador acreditado por el ETTE / Responsable del CC receptor</td>
                <td class="mono">{{ $acta['recepcion']['dni'] }}</td>
                <td>{{ $acta['recepcion']['nombre'] }}</td>
                <td>{{ $acta['recepcion']['cargo'] }}</td>
            </tr>
        </tbody>
    </table>

    <div class="seccion-titulo">III. Información y Documentación Entregada</div>
    <table>
        <thead>
            <tr><th class="celda-n">N°</th><th>Información / documentación</th><th>Condición</th></tr>
        </thead>
        <tbody>
            @foreach ($acta['anexos'] as $i => $fila)
                <tr>
                    <td class="celda-n">{{ $i + 1 }}</td>
                    <td>{{ $fila['nombre'] }}</td>
                    <td>{!! $fila['entregado'] ? '&#9746; Entregado' : '&#9744; No entregado' !!}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    @if (! empty($acta['observaciones']))
        <div class="seccion-titulo">IV. Observaciones</div>
        <p class="declaracion">{{ $acta['observaciones'] }}</p>
    @endif

    <p class="declaracion">
        En constancia de lo señalado, los intervinientes suscriben la presente Acta de Transferencia
        Administrativa de Gestión y Entrega de Cargo.
    </p>

    <table class="firma-bloque">
        <tr>
            <td>
                <div class="firma-linea">Responsable que efectúa la entrega</div>
                {{ $acta['entrega']['nombre'] ?: 'Nombres y apellidos' }}<br>
                DNI: {{ $acta['entrega']['dni'] ?: '________________' }}<br>
                {{ $acta['dependencia'] }}
            </td>
            <td>
                <div class="firma-linea">Responsable de la recepción / verificación</div>
                {{ $acta['recepcion']['nombre'] ?: 'Coordinador ETTE / CC receptor' }}<br>
                DNI: {{ $acta['recepcion']['dni'] ?: '________________' }}
            </td>
        </tr>
    </table>
@endsection

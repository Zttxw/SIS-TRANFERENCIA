{{-- Constancia de reemplazo de coordinador ETTE (RF-15, RN-12, F-12). --}}
@extends('pdf.layout')

@section('anexo_titulo', 'Constancia de reemplazo de coordinador ETTE')

@section('cuerpo')
    <table>
        <tbody>
            <tr><td class="etiqueta">Centro de costo</td><td>{{ $constancia['centro_costo'] }}</td></tr>
            <tr><td class="etiqueta">Coordinador reemplazado</td><td>{{ $constancia['anterior']['nombre'] }} (DNI {{ $constancia['anterior']['dni'] }})</td></tr>
            <tr><td class="etiqueta">Acreditado desde</td><td>{{ $constancia['anterior']['acreditado_en'] ?? '—' }}</td></tr>
            <tr><td class="etiqueta">Nuevo coordinador</td><td>{{ $constancia['nuevo']['nombre'] }} (DNI {{ $constancia['nuevo']['dni'] }})</td></tr>
            <tr><td class="etiqueta">Fecha del reemplazo</td><td>{{ $constancia['fecha'] }}</td></tr>
            <tr><td class="etiqueta">Motivo</td><td>{{ $constancia['motivo'] }}</td></tr>
            <tr><td class="etiqueta">Registrado por</td><td>{{ $constancia['registrado_por'] ?? '—' }}</td></tr>
        </tbody>
    </table>

    <p class="declaracion">
        Se deja constancia de que, a partir de la fecha indicada, el nuevo coordinador asume la revisión,
        verificación y firma del lado ETTE de este centro de costo. Las firmas y observaciones registradas
        por el coordinador reemplazado se conservan sin cambios y los plazos del cronograma no se modifican.
    </p>

    <table class="firma-bloque">
        <tr>
            <td>
                <div class="firma-linea">Titular ETTE</div>
                {{ $constancia['registrado_por'] ?? 'Nombres y apellidos' }}
            </td>
            <td>
                <div class="firma-linea">Nuevo coordinador ETTE</div>
                {{ $constancia['nuevo']['nombre'] }}<br>
                DNI: {{ $constancia['nuevo']['dni'] }}
            </td>
        </tr>
    </table>
@endsection

{{-- Constancia de entrega del ETTS al ETTE (RF-75, D-12). --}}
@extends('pdf.layout')

@section('anexo_titulo', 'Constancia de entrega del ETTS al ETTE')

@section('cuerpo')
    <table>
        <tbody>
            <tr><td class="etiqueta">Lote</td><td>{{ $envio['codigo'] }}</td></tr>
            <tr><td class="etiqueta">Fecha y hora del envío</td><td>{{ $envio['enviado_en'] }}</td></tr>
            <tr><td class="etiqueta">Enviado por (ETTS)</td><td>{{ $envio['enviado_por'] ?? '—' }}</td></tr>
            <tr><td class="etiqueta">Centros de costo</td><td>{{ count($centros) }}</td></tr>
            @if ($envio['comentario'])
                <tr><td class="etiqueta">Comentario</td><td>{{ $envio['comentario'] }}</td></tr>
            @endif
        </tbody>
    </table>

    <div class="seccion-titulo">Relación de entregas</div>
    <table>
        <thead>
            <tr>
                <th>Código</th>
                <th>Centro de costo</th>
                <th>Recibida por el ETTS</th>
                <th>CC dependientes consolidados</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($centros as $centro)
                <tr>
                    <td>{{ $centro['codigo'] }}</td>
                    <td>{{ $centro['nombre'] }}</td>
                    <td>{{ $centro['recibida_etts_en'] ?? '—' }}</td>
                    <td>
                        @forelse ($centro['subarbol'] as $hijo)
                            {{ $hijo['codigo'] }} {{ $hijo['nombre'] }} — {{ $hijo['estado'] }}@if ($hijo['enviado_tarde']) (enviado tarde)@endif<br>
                        @empty
                            —
                        @endforelse
                    </td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <p class="declaracion">
        Se deja constancia de que el Equipo de Transferencia del Titular Saliente (ETTS) entrega al Equipo de
        Transferencia del Titular Entrante (ETTE) la información de los centros de costo indicados, con sus anexos
        02 al 07 firmados por el responsable de cada centro de costo y su coordinador ETTE.
    </p>

    <table class="firma-bloque">
        <tr>
            <td>
                <div class="firma-linea">Entrega: ETTS</div>
                {{ $envio['enviado_por'] ?? 'Nombres y apellidos' }}
            </td>
            <td>
                <div class="firma-linea">Recibe: ETTE</div>
                Nombres y apellidos
            </td>
        </tr>
    </table>
@endsection

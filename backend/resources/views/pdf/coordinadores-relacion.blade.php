{{-- Relación de coordinadores ETTE acreditados por centro de costo (RF-13). --}}
@extends('pdf.layout')

@section('anexo_titulo', 'Relación de coordinadores ETTE acreditados')

@section('cuerpo')
    <table>
        <thead>
            <tr>
                <th class="celda-n">N.°</th>
                <th>Código CC</th>
                <th>Centro de costo</th>
                <th>Coordinador ETTE</th>
                <th>DNI</th>
                <th>Correo / celular</th>
                <th>Acreditado</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($filas as $i => $fila)
                <tr>
                    <td class="celda-n">{{ $i + 1 }}</td>
                    <td class="mono nowrap">{{ $fila['codigo'] }}</td>
                    <td>{{ $fila['centro_costo'] }}</td>
                    <td>{{ $fila['nombre'] }}</td>
                    <td class="mono">{{ $fila['dni'] }}</td>
                    <td>{{ collect([$fila['correo'], $fila['celular']])->filter()->implode(' · ') ?: '—' }}</td>
                    <td class="nowrap">{{ $fila['acreditado_en'] ?? '—' }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="7" class="vacio">No hay coordinadores ETTE acreditados en el proceso.</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    @if (! empty($sinCoordinador))
        <div class="seccion-titulo">Centros de costo sin coordinador ETTE</div>
        <p class="declaracion">{{ implode(' · ', $sinCoordinador) }}</p>
    @endif
@endsection

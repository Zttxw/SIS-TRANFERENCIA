@extends('pdf.layout')

@section('anexo_titulo', $reporte['titulo'])

@section('cuerpo')
    @if (! empty($reporte['metricas']))
        <table>
            <tbody>
                <tr>
                    @foreach ($reporte['metricas'] as $etiqueta => $valor)
                        <td class="etiqueta" style="width:auto">{{ $etiqueta }}</td>
                        <td style="text-align:center">{{ $valor }}</td>
                    @endforeach
                </tr>
            </tbody>
        </table>
    @endif

    <table>
        <thead>
            <tr>
                @foreach ($reporte['headings'] as $h)
                    <th>{{ $h }}</th>
                @endforeach
            </tr>
        </thead>
        <tbody>
            @forelse ($reporte['filas'] as $fila)
                <tr>
                    @foreach ($fila as $celda)
                        <td>{{ $celda }}</td>
                    @endforeach
                </tr>
            @empty
                <tr>
                    <td colspan="{{ count($reporte['headings']) }}" class="vacio">Sin datos para el ámbito seleccionado.</td>
                </tr>
            @endforelse
        </tbody>
    </table>
@endsection

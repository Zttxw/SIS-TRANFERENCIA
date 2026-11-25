{{-- Cuerpo del Anexo 03-A (físico, en folios) o 03-B (digital SGD, en n° de documentos). Requiere: $cabecera, $columnaCantidad, $grupos (bloques por año). --}}
<table>
    <tr><td class="etiqueta">Dependencia</td><td>{{ $cabecera['dependencia'] ?: '—' }}</td></tr>
    <tr><td class="etiqueta">Encargado</td><td>{{ $cabecera['encargado'] ?: '—' }}</td></tr>
</table>

<table>
    <thead>
        <tr>
            <th class="celda-n">N°</th><th>Serie Documental</th><th class="celda-n">{{ $columnaCantidad }}</th>
            <th>Tipo de Unidades de Conservación</th><th>Ubicación de Unidades de Conservación</th>
        </tr>
    </thead>
    <tbody>
        @forelse ($grupos as $grupo)
            <tr><td colspan="5" class="etiqueta">AÑO {{ $grupo['anio'] }}</td></tr>
            @foreach ($grupo['series'] as $i => $serie)
                <tr>
                    <td class="celda-n">{{ $i + 1 }}</td>
                    <td>{{ $serie['serie_documental'] ?? '' }}</td>
                    <td class="celda-n">{{ $serie['cantidad'] ?? '' }}</td>
                    <td>{{ $serie['unidad_conservacion'] ?? '' }}</td>
                    <td>{{ $serie['ubicacion'] ?? '' }}</td>
                </tr>
            @endforeach
        @empty
            <tr><td colspan="5" class="vacio">Sin series documentales registradas.</td></tr>
        @endforelse
    </tbody>
</table>

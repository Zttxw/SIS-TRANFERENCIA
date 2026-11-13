{{-- Cuerpo del Anexo 03. Requiere: $cabecera, $grupos. --}}
<table>
    <tr><td class="etiqueta">Dependencia</td><td>{{ $cabecera['dependencia'] ?: '—' }}</td></tr>
    <tr><td class="etiqueta">Encargado</td><td>{{ $cabecera['encargado'] ?: '—' }}</td></tr>
</table>

<table>
    <thead>
        <tr>
            <th class="celda-n">N°</th><th>Serie Documental</th><th class="celda-n">Desde Año</th>
            <th class="celda-n">Hasta Año</th><th>Cantidad de Unidades de Conservación</th><th>Tipo de Unidades de Conservación</th><th>Ubicación de Unidades de Conservación</th>
        </tr>
    </thead>
    <tbody>
        @forelse ($grupos as $grupo)
            <tr><td colspan="7" class="etiqueta">AÑO {{ $grupo['anio'] }}</td></tr>
            @foreach ($grupo['series'] as $i => $serie)
                <tr>
                    <td class="celda-n">{{ $i + 1 }}</td>
                    <td>{{ $serie['serie_documental'] ?? '' }}</td>
                    <td class="celda-n">{{ $serie['desde_anio'] ?? '' }}</td>
                    <td class="celda-n">{{ $serie['hasta_anio'] ?? '' }}</td>
                    <td>{{ $serie['cantidad_unidades'] ?? '' }}</td>
                    <td>{{ $serie['unidad_conservacion'] ?? '' }}</td>
                    <td>{{ $serie['ubicacion'] ?? '' }}</td>
                </tr>
            @endforeach
        @empty
            <tr><td colspan="7" class="vacio">Sin series documentales registradas.</td></tr>
        @endforelse
    </tbody>
</table>

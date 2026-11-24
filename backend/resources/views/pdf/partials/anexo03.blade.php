{{-- Cuerpo del Anexo 03. Requiere: $cabecera, $secciones (A digital, B física; cada una con bloques por año). --}}
<table>
    <tr><td class="etiqueta">Dependencia</td><td>{{ $cabecera['dependencia'] ?: '—' }}</td></tr>
    <tr><td class="etiqueta">Encargado</td><td>{{ $cabecera['encargado'] ?: '—' }}</td></tr>
</table>

@foreach ($secciones as $seccion)
    <div class="seccion-titulo">{{ $seccion['letra'] }}. {{ $seccion['titulo'] }}</div>
    <table>
        <thead>
            <tr>
                <th class="celda-n">N°</th><th>Serie Documental</th><th class="celda-n">Folios</th>
                <th>Tipo de Unidades de Conservación</th><th>Ubicación de Unidades de Conservación</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($seccion['grupos'] as $grupo)
                <tr><td colspan="5" class="etiqueta">AÑO {{ $grupo['anio'] }}</td></tr>
                @foreach ($grupo['series'] as $i => $serie)
                    <tr>
                        <td class="celda-n">{{ $i + 1 }}</td>
                        <td>{{ $serie['serie_documental'] ?? '' }}</td>
                        <td class="celda-n">{{ $serie['folios'] ?? '' }}</td>
                        <td>{{ $serie['unidad_conservacion'] ?? '' }}</td>
                        <td>{{ $serie['ubicacion'] ?? '' }}</td>
                    </tr>
                @endforeach
            @empty
                <tr><td colspan="5" class="vacio">Sin series documentales registradas.</td></tr>
            @endforelse
        </tbody>
    </table>
@endforeach

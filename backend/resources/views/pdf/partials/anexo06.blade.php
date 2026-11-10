{{-- Cuerpo del Anexo 06. Requiere: $cabecera, $bienes. --}}
<table>
    <tr><td class="etiqueta">Dependencia</td><td>{{ $cabecera['dependencia'] ?: '—' }}</td></tr>
    <tr><td class="etiqueta">Encargado</td><td>{{ $cabecera['encargado'] ?: '—' }}</td></tr>
</table>

<table>
    <thead>
        <tr>
            <th class="celda-n" rowspan="2">N°</th><th rowspan="2">Descripción</th><th rowspan="2">Unidad de Medida</th>
            <th rowspan="2">Cantidad</th><th colspan="3" style="text-align:center">Estado situacional</th>
            <th rowspan="2">Ubicación</th><th rowspan="2">Observaciones</th>
        </tr>
        <tr><th class="celda-n">B</th><th class="celda-n">R</th><th class="celda-n">M</th></tr>
    </thead>
    <tbody>
        @forelse ($bienes as $i => $bien)
            <tr>
                <td class="celda-n">{{ $i + 1 }}</td>
                <td>{{ $bien['descripcion'] ?? '' }}</td>
                <td>{{ $bien['unidad_medida'] ?? '' }}</td>
                <td class="celda-n">{{ $bien['cantidad'] ?? '' }}</td>
                <td class="celda-n">{{ ($bien['estado'] ?? '') === 'B' ? 'X' : '' }}</td>
                <td class="celda-n">{{ ($bien['estado'] ?? '') === 'R' ? 'X' : '' }}</td>
                <td class="celda-n">{{ ($bien['estado'] ?? '') === 'M' ? 'X' : '' }}</td>
                <td>{{ $bien['ubicacion'] ?? '' }}</td>
                <td>{{ $bien['observaciones'] ?? '' }}</td>
            </tr>
        @empty
            <tr><td colspan="9" class="vacio">Sin bienes no patrimoniales registrados (o «No Aplica» para esta dependencia).</td></tr>
        @endforelse
    </tbody>
</table>

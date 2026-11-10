{{-- Cuerpo del Anexo 05. Requiere: $cabecera, $personal. --}}
<table>
    <tr><td class="etiqueta">Dependencia</td><td>{{ $cabecera['dependencia'] ?: '—' }}</td></tr>
    <tr><td class="etiqueta">Encargado</td><td>{{ $cabecera['encargado'] ?: '—' }}</td></tr>
</table>

<table>
    <thead>
        <tr>
            <th class="celda-n">N°</th><th>DNI</th><th>Apellidos y Nombres</th><th>Cargo</th>
            <th>Régimen Laboral</th><th>Modalidad Contractual</th><th>Situación Laboral Actual</th><th>Observaciones</th>
        </tr>
    </thead>
    <tbody>
        @forelse ($personal as $i => $p)
            <tr>
                <td class="celda-n">{{ $i + 1 }}</td>
                <td class="mono">{{ $p['dni'] ?? '' }}</td>
                <td>{{ $p['nombre'] ?? '' }}</td>
                <td>{{ $p['cargo'] ?? '' }}</td>
                <td>{{ $p['regimen_laboral'] ?? '' }}</td>
                <td>{{ $p['modalidad_contractual'] ?? '' }}</td>
                <td>{{ $p['situacion_laboral'] ?? '' }}</td>
                <td>{{ $p['observaciones'] ?? '' }}</td>
            </tr>
        @empty
            <tr><td colspan="8" class="vacio">Sin personal registrado para esta dependencia.</td></tr>
        @endforelse
    </tbody>
</table>

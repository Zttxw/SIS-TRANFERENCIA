{{-- Cuerpo del Anexo 04. Requiere: $cabecera, $grupos. La columna de observaciones solo se imprime si el grupo tiene alguna. --}}
@forelse ($grupos as $grupo)
    <div class="seccion-titulo">Servidor Responsable de los Bienes</div>
    <table>
        <tr><td class="etiqueta">Centro de Costos</td><td>{{ $cabecera['dependencia'] ?: '—' }}</td></tr>
        <tr><td class="etiqueta">Nombre y Apellidos</td><td>{{ $grupo['servidor']['nombre'] ?: 'Sin servidor asignado' }}</td></tr>
        <tr><td class="etiqueta">DNI</td><td>{{ $grupo['servidor']['dni'] ?: '—' }}</td></tr>
        <tr><td class="etiqueta">Cargo</td><td>{{ $grupo['servidor']['cargo'] ?: '—' }}</td></tr>
    </table>

    <table>
        <thead>
            <tr>
                <th class="celda-n">N°</th><th>Código patrimonial</th><th>Denominación</th><th>Estado</th>
                <th>Marca</th><th>Modelo</th><th>Serie</th>
                @if ($grupo['tiene_observaciones'])
                    <th>Observaciones</th>
                @endif
            </tr>
        </thead>
        <tbody>
            @foreach ($grupo['bienes'] as $i => $bien)
                <tr>
                    <td class="celda-n">{{ $i + 1 }}</td>
                    <td class="mono">{{ $bien['codigo_patrimonial'] ?? '' }}</td>
                    <td>{{ $bien['denominacion'] ?? '' }}</td>
                    <td>{{ $bien['estado'] ?? '' }}</td>
                    <td>{{ $bien['marca'] ?? '' }}</td>
                    <td>{{ $bien['modelo'] ?? '' }}</td>
                    <td>{{ $bien['serie'] ?? '' }}</td>
                    @if ($grupo['tiene_observaciones'])
                        <td>{{ $bien['observacion'] }}</td>
                    @endif
                </tr>
            @endforeach
        </tbody>
    </table>
@empty
    <table><tbody><tr><td class="vacio">Sin bienes patrimoniales registrados para esta dependencia.</td></tr></tbody></table>
@endforelse

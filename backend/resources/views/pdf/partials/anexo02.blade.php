{{-- Cuerpo del Anexo 02 reutilizable por el PDF individual y el expediente.
     Requiere: $informe (modelo de vista) y $nivelCheck (closure). --}}
<div class="seccion-titulo">I. Identificación del Centro de Costo y Principales Funciones</div>
<table>
    <tr><td class="etiqueta">Entidad</td><td>Municipalidad Distrital de San Jerónimo</td></tr>
    <tr><td class="etiqueta">Órgano / unidad de organización</td><td>{{ $informe['organo'] ?: '—' }}</td></tr>
    <tr><td class="etiqueta">Denominación del centro de costo</td><td>{{ $informe['denominacion'] ?: '—' }}</td></tr>
    <tr>
        <td class="etiqueta">Nivel organizacional</td>
        <td>
            {!! $nivelCheck('primer_nivel') !!} Primer nivel
            {!! $nivelCheck('segundo_nivel') !!} Segundo nivel
            {!! $nivelCheck('tercer_nivel') !!} Tercer nivel
            {!! $nivelCheck('equipo_trabajo') !!} Equipo de trabajo
        </td>
    </tr>
    <tr><td class="etiqueta">Nombre completo del responsable que efectúa la entrega</td><td>{{ $informe['responsable'] ?: '—' }}</td></tr>
    <tr><td class="etiqueta">Cargo / puesto y periodo de gestión</td><td>{{ $informe['cargo_periodo'] ?: '—' }}</td></tr>
</table>

<table>
    <thead><tr><th class="celda-n">N°</th><th>Función principal</th></tr></thead>
    <tbody>
        @forelse ($informe['funciones'] as $fila)
            <tr><td class="celda-n">{{ $fila['n'] ?? $loop->iteration }}</td><td>{{ $fila['descripcion'] ?? '' }}</td></tr>
        @empty
            <tr><td class="celda-n">1</td><td class="vacio">Sin funciones registradas</td></tr>
        @endforelse
    </tbody>
</table>

<div class="seccion-titulo">II. Logros y Resultados Obtenidos Durante el Periodo de Gestión</div>
<table>
    <thead>
        <tr>
            <th class="celda-n">N°</th><th>Actividad / intervención</th><th>Resultado o logro obtenido</th>
            <th>Indicador / meta y nivel de cumplimiento</th><th>Documento o medio de verificación</th>
        </tr>
    </thead>
    <tbody>
        @forelse ($informe['logros_items'] as $fila)
            <tr>
                <td class="celda-n">{{ $fila['n'] ?? $loop->iteration }}</td>
                <td>{{ $fila['actividad'] ?? '' }}</td>
                <td>{{ $fila['resultado'] ?? '' }}</td>
                <td>{{ $fila['indicador'] ?? '' }}</td>
                <td>{{ $fila['verificacion'] ?? '' }}</td>
            </tr>
        @empty
            <tr><td class="celda-n">1</td><td colspan="4" class="vacio">Sin logros registrados</td></tr>
        @endforelse
    </tbody>
</table>

<div class="seccion-titulo">III. Principales Dificultades Afrontadas</div>
<table>
    <thead>
        <tr><th class="celda-n">N°</th><th>Dificultad identificada y causa</th><th>Efecto en la gestión / actividad afectada</th><th>Medida adoptada o recomendada</th></tr>
    </thead>
    <tbody>
        @forelse ($informe['dificultades_items'] as $fila)
            <tr>
                <td class="celda-n">{{ $fila['n'] ?? $loop->iteration }}</td>
                <td>{{ $fila['dificultad'] ?? '' }}</td>
                <td>{{ $fila['efecto'] ?? '' }}</td>
                <td>{{ $fila['medida'] ?? '' }}</td>
            </tr>
        @empty
            <tr><td class="celda-n">1</td><td colspan="3" class="vacio">Sin dificultades registradas</td></tr>
        @endforelse
    </tbody>
</table>

<div class="seccion-titulo">IV. Agenda Pendiente y Asuntos que Requieren Atención</div>
<table>
    <thead>
        <tr>
            <th class="celda-n">N°</th><th>Asunto pendiente / descripción</th><th>Estado situacional y acción requerida</th>
            <th>Documento de referencia / expediente</th><th>Plazo o fecha relevante</th><th>Unidad o responsable competente</th>
        </tr>
    </thead>
    <tbody>
        @forelse ($informe['pendientes_items'] as $fila)
            <tr>
                <td class="celda-n">{{ $fila['n'] ?? $loop->iteration }}</td>
                <td>{{ $fila['asunto'] ?? '' }}</td>
                <td>{{ $fila['estado_accion'] ?? '' }}</td>
                <td>{{ $fila['documento_referencia'] ?? '' }}</td>
                <td>{{ $fila['plazo'] ?? '' }}</td>
                <td>{{ $fila['responsable'] ?? '' }}</td>
            </tr>
        @empty
            <tr><td class="celda-n">1</td><td colspan="5" class="vacio">Sin asuntos pendientes registrados</td></tr>
        @endforelse
    </tbody>
</table>

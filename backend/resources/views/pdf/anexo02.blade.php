@extends('pdf.layout')

@section('anexo_titulo', 'Anexo 02 — Informe de Gestión')

@section('cuerpo')
    @include('pdf.partials.anexo02', ['informe' => $informe, 'nivelCheck' => $nivelCheck])

    {{-- V. Declaración y suscripción (solo en el PDF individual) --}}
    <div class="seccion-titulo">V. Declaración y Suscripción</div>
    <p class="declaracion">
        Declaro que la información consignada en el presente Informe de Gestión corresponde al
        ámbito de las funciones a mi cargo y ha sido elaborada de acuerdo con la documentación y
        los registros disponibles, sin perjuicio de las responsabilidades que correspondan conforme
        a la normativa vigente.
    </p>

    <table class="firma-bloque">
        <tr>
            <td>
                <div class="firma-linea">{{ $informe['responsable'] ?: 'Nombres y apellidos' }}</div>
                DNI: {{ $informe['responsable_dni'] ?: '________________' }}<br>
                {{ $informe['cargo_periodo'] ?: 'Cargo / centro de costo' }}<br>
                Responsable que efectúa la entrega
            </td>
            <td>
                <div class="firma-linea">Lugar y fecha</div>
                San Jerónimo, ______ de ____________ de 20____
            </td>
        </tr>
    </table>
@endsection

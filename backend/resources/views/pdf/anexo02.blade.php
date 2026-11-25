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

    @include('pdf.partials.firmas', $firmas)
@endsection

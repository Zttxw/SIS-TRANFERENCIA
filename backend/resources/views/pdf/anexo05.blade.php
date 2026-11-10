@extends('pdf.layout')

@section('anexo_titulo', 'Anexo 05 — Información del Personal a Cargo del Centro de Costo')

@section('cuerpo')
    @include('pdf.partials.anexo05', ['cabecera' => $cabecera, 'personal' => $personal])
@endsection

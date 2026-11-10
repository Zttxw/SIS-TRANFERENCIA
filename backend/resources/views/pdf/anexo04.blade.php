@extends('pdf.layout')

@section('anexo_titulo', 'Anexo 04 — Registro de Bienes Patrimoniales')

@section('cuerpo')
    @include('pdf.partials.anexo04', ['cabecera' => $cabecera, 'grupos' => $grupos])
@endsection

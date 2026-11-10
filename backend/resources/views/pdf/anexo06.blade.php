@extends('pdf.layout')

@section('anexo_titulo', 'Anexo 06 — Bienes No Patrimoniales')

@section('cuerpo')
    @include('pdf.partials.anexo06', ['cabecera' => $cabecera, 'bienes' => $bienes])
@endsection

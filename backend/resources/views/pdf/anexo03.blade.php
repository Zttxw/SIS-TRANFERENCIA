@extends('pdf.layout')

@section('anexo_titulo', 'Anexo 03 — Registro del Acervo Documentario')

@section('cuerpo')
    @include('pdf.partials.anexo03', ['cabecera' => $cabecera, 'grupos' => $grupos])
@endsection

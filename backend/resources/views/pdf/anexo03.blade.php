@extends('pdf.layout')

@section('anexo_titulo', $titulo)

@section('cuerpo')
    @include('pdf.partials.anexo03', ['cabecera' => $cabecera, 'columnaCantidad' => $columna_cantidad, 'grupos' => $grupos])
@endsection

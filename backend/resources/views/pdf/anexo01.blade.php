@extends('pdf.layout')

@section('anexo_titulo', 'Anexo 01 — Relación de Centros de Costo')

@section('cuerpo')
    <p>Relación institucional de centros de costo del proceso de transferencia.</p>
    <table>
        <thead>
            <tr>
                <th>Código</th>
                <th>Descripción</th>
                <th>Nivel organizacional</th>
                <th>CC padre</th>
                <th>Estado</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($centros as $centro)
                <tr>
                    <td>{{ $centro->codigo }}</td>
                    <td>{{ $centro->nombre }}</td>
                    <td>{{ $centro->nivel }}</td>
                    <td>{{ $centro->padre?->codigo ?? $centro->codigo }}</td>
                    <td>{{ $centro->activa ? 'Activo' : 'Inactivo' }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
@endsection

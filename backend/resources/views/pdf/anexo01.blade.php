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

    @if ($institucional ?? false)
        <p class="declaracion">
            Relación de los centros de costo registrados en el Plan Operativo Institucional (CEPLAN) que participaron
            en el proceso de transferencia. Se suscribe al cierre, cuando el ETTE recibió las entregas de todos los
            centros de costo.
        </p>

        <table class="firma-bloque">
            <tr>
                <td><div class="firma-linea">Equipo de Transferencia del Titular Saliente (ETTS)</div></td>
                <td><div class="firma-linea">Titular del Equipo de Transferencia del Titular Entrante (ETTE)</div></td>
            </tr>
        </table>
    @endif
@endsection

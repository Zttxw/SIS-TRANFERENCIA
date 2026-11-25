{{-- Bloque de suscripción de dos lados (anexos 02 al 07): a la izquierda el
     responsable que entrega y a la derecha quien recibe y verifica por el ETTE.
     Espera $entrega (nombre, dni, cargo), $recepcion (nombre, dni, cargo,
     calidad) y $centro («código — nombre» del centro de costo). --}}
<table class="firma-bloque">
    <tr>
        <td>
            <div class="firma-linea">Responsable que efectúa la entrega</div>
            {{ $entrega['nombre'] ?: 'Nombres y apellidos' }}<br>
            DNI: {{ $entrega['dni'] ?: '________________' }}<br>
            @if ($entrega['cargo'])
                {{ $entrega['cargo'] }}<br>
            @endif
            {{ $centro }}
        </td>
        <td>
            <div class="firma-linea">Responsable de la recepción y verificación</div>
            {{ $recepcion['nombre'] ?: 'Nombres y apellidos' }}<br>
            DNI: {{ $recepcion['dni'] ?: '________________' }}<br>
            {{ $recepcion['calidad'] }}
            @if ($recepcion['cargo'])
                <br>{{ $recepcion['cargo'] }}
            @endif
        </td>
    </tr>
</table>

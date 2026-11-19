<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Modules\Transferencia\Models\Feriado;
use App\Support\Enums\AlcanceFeriado;
use Illuminate\Database\Seeder;

/**
 * Feriados nacionales de 2026 y 2027 (RF-22) y el feriado regional del Cusco
 * (24 de junio). Los días no laborables que declare el Gobierno o la
 * Municipalidad se registran desde el cronograma. Idempotente.
 */
class FeriadosSeeder extends Seeder
{
    /** @var array<string, string> mes-día => descripción */
    private const FIJOS = [
        '01-01' => 'Año Nuevo',
        '05-01' => 'Día del Trabajo',
        '06-07' => 'Batalla de Arica y Día de la Bandera',
        '06-29' => 'San Pedro y San Pablo',
        '07-23' => 'Día de la Fuerza Aérea del Perú',
        '07-28' => 'Fiestas Patrias',
        '07-29' => 'Fiestas Patrias',
        '08-06' => 'Batalla de Junín',
        '08-30' => 'Santa Rosa de Lima',
        '10-08' => 'Combate de Angamos',
        '11-01' => 'Día de Todos los Santos',
        '12-08' => 'Inmaculada Concepción',
        '12-09' => 'Batalla de Ayacucho',
        '12-25' => 'Navidad',
    ];

    /** @var array<int, array{string, string}> año => [Jueves Santo, Viernes Santo] */
    private const SEMANA_SANTA = [
        2026 => ['2026-04-02', '2026-04-03'],
        2027 => ['2027-03-25', '2027-03-26'],
    ];

    public function run(): void
    {
        foreach (self::SEMANA_SANTA as $anio => [$jueves, $viernes]) {
            foreach (self::FIJOS as $mesDia => $descripcion) {
                $this->registrar("{$anio}-{$mesDia}", $descripcion, AlcanceFeriado::NACIONAL);
            }
            $this->registrar($jueves, 'Jueves Santo', AlcanceFeriado::NACIONAL);
            $this->registrar($viernes, 'Viernes Santo', AlcanceFeriado::NACIONAL);
            $this->registrar("{$anio}-06-24", 'Día del Cusco (Inti Raymi)', AlcanceFeriado::LOCAL);
        }
    }

    private function registrar(string $fecha, string $descripcion, AlcanceFeriado $alcance): void
    {
        Feriado::query()->updateOrCreate(['fecha' => $fecha], ['descripcion' => $descripcion, 'alcance' => $alcance]);
    }
}

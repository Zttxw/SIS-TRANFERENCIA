<?php

declare(strict_types=1);

namespace App\Modules\Personal\Services;

use App\Modules\Organization\Models\Servidor;
use App\Modules\Personal\Models\Personal;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\FuenteDato;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Proyecta el padrón de servidores del SGD hacia la relación de personal del
 * Anexo 05. El SGD no expone una tabla "personal" aparte: su padrón de empleados
 * (RHTM_PER_EMPLEADOS) ya se ingesta en `servidores`, y el Anexo 05 es esa misma
 * nómina vista por dependencia. Este servicio deriva una de la otra.
 *
 * Campos que el SGD no provee (régimen, modalidad y situación laboral) quedan
 * en null para que el responsable los complete al validar.
 *
 * Idempotente y respetuoso con ediciones manuales: los registros marcados como
 * `fuente=manual` (creados/editados por un usuario) no se sobrescriben.
 */
class IngestaPersonalSgd
{
    /**
     * @return array{personal: int, omitidos: int}
     */
    public function ejecutar(ProcesoTransferencia $proceso, ?string $codigoDependencia = null): array
    {
        $extraidoEn = Carbon::now();

        $query = Servidor::query()
            ->where('proceso_transferencia_id', $proceso->id)
            ->whereNotNull('dependencia_id')
            ->whereNotNull('dni');

        if ($codigoDependencia !== null) {
            $depId = DB::table('dependencias')
                ->where('proceso_transferencia_id', $proceso->id)
                ->where('codigo', $codigoDependencia)
                ->value('id');

            // Dependencia inexistente: nada que proyectar.
            $query->where('dependencia_id', $depId ?? -1);
        }

        $servidores = $query->get([
            'id', 'dni', 'nombres', 'apellidos', 'cargo',
            'regimen_laboral', 'modalidad_contractual', 'situacion_laboral',
            'dependencia_id',
        ]);

        $ingestados = 0;
        $omitidos = 0;

        DB::transaction(function () use ($servidores, $proceso, $extraidoEn, &$ingestados, &$omitidos) {
            foreach ($servidores as $srv) {
                // No pisar registros que un usuario ya editó manualmente.
                $existente = Personal::withTrashed()
                    ->where('proceso_transferencia_id', $proceso->id)
                    ->where('dni', $srv->dni)
                    ->first();

                if ($existente !== null && $existente->fuente === FuenteDato::MANUAL->value) {
                    $omitidos++;

                    continue;
                }

                $personal = Personal::withTrashed()->updateOrCreate(
                    [
                        'proceso_transferencia_id' => $proceso->id,
                        'dni' => $srv->dni,
                    ],
                    [
                        'dependencia_id' => $srv->dependencia_id,
                        'servidor_id' => $srv->id,
                        'nombres' => $srv->nombres,
                        'apellidos' => $srv->apellidos,
                        'cargo' => $srv->cargo,
                        'regimen_laboral' => $srv->regimen_laboral,
                        'modalidad_contractual' => $srv->modalidad_contractual,
                        'situacion_laboral' => $srv->situacion_laboral,
                        'validado' => false,
                        'fuente' => FuenteDato::SGD->value,
                        'fuente_referencia' => "servidores.id={$srv->id}",
                        'extraido_en' => $extraidoEn,
                    ]
                );

                if ($personal->trashed()) {
                    $personal->restore();
                }

                $ingestados++;
            }
        });

        return ['personal' => $ingestados, 'omitidos' => $omitidos];
    }
}

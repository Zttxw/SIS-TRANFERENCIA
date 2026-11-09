<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Rellena `dependencias.codigo_siga` en las dependencias maestras (fuente SGD),
 * materializando el empate SGD↔SIGA por código.
 *
 * El diccionario se construyó emparejando por nombre normalizado (tildes,
 * mayúsculas, siglas CIAM/DEMUNA/OMAPED/SISFOH/PVL) y verificándolo a mano.
 * Solo incluye los 59 centros de costo del SIGA que tienen bienes; los nodos
 * padre sin patrimonio propio (gerencias, oficinas generales) se omiten.
 *
 * Idempotente: usa UPDATE por `codigo` (el ID interno del SGD) dentro del
 * proceso correspondiente. Clave = codigo_sgd, valor = codigo_siga.
 */
class MapeoDependenciasSigaSeeder extends Seeder
{
    /**
     * codigo_sgd (ID interno del SGD) => codigo_siga (centro de costo jerárquico).
     *
     * @var array<string, string>
     */
    private const MAPEO = [
        '00097' => '01.01.01',          // Órgano de Control Institucional
        '00065' => '01.01.02',          // Procuraduría Pública Municipal
        '00001' => '01.02.01',          // Alcaldía (Despacho de Alcaldía en SIGA)
        '00003' => '01.02.02.01',       // Secretaría General y Gestión Documentaria
        '00063' => '01.02.02.02',       // Unidad de Trámite Documentario
        '00018' => '01.02.02.03',       // Unidad de Archivo Central
        '00002' => '01.03.01',          // Gerencia Municipal
        '00004' => '01.03.02',          // Imagen Institucional y Comunicaciones
        '00005' => '01.03.03',          // Ejecución Coactiva
        '00006' => '01.03.04',          // Gestión del Riesgo de Desastres
        '00007' => '01.03.05.01',       // Oficina General de Administración
        '00020' => '01.03.05.02.01',    // Recursos Humanos
        '00057' => '01.03.05.02.02',    // Seguridad y Salud en el Trabajo
        '00058' => '01.03.05.02.03',    // Secretaría Técnica del PAD
        '00021' => '01.03.05.03.01',    // Abastecimiento
        '00070' => '01.03.05.03.02',    // Unidad de Almacén
        '00023' => '01.03.05.04',       // Gestión Patrimonial
        '00022' => '01.03.05.05',       // Contabilidad
        '00024' => '01.03.05.06',       // Tesorería
        '00015' => '01.03.06.01',       // Supervisión y Liquidación de Inversiones
        '00013' => '01.03.07.01',       // Planeamiento y Presupuesto
        '00027' => '01.03.07.03',       // Planeamiento y Modernización
        '00025' => '01.03.07.04',       // Tecnologías de la Información
        '00028' => '01.03.07.05',       // Cooperación Técnica Nacional e Internacional
        '00029' => '01.03.07.06',       // Programación Multianual de Inversiones
        '00008' => '01.03.08.01',       // Asesoría Jurídica
        '00016' => '01.03.09.01',       // Gestión de Inversiones
        '00030' => '01.03.09.02',       // Formulación y Evaluación de Inversiones
        '00009' => '01.03.10.01',       // Administración Tributaria
        '00032' => '01.03.10.02',       // Rentas
        '00033' => '01.03.10.03',       // Registro Civil y Cementerios
        '00017' => '01.03.11.01',       // Infraestructura
        '00037' => '01.03.11.02',       // Ejecución de Inversiones
        '00035' => '01.03.11.03',       // Mantenimiento
        '00036' => '01.03.11.04',       // Equipo Mecánico
        '00010' => '01.03.12.01',       // Desarrollo Urbano y Rural
        '00038' => '01.03.12.02.01',    // Ordenamiento Territorial y Tránsito
        '00066' => '01.03.12.02.02',    // División/Unidad de Tránsito
        '00039' => '01.03.12.03',       // Gestión de Edificaciones
        '00040' => '01.03.12.04.01',    // Catastro y Saneamiento Físico Legal
        '00014' => '01.03.13.01',       // Desarrollo Económico Local
        '00041' => '01.03.13.02',       // Competitividad Empresarial y Turismo
        '00042' => '01.03.13.03.01',    // Comercio, Mercados y Policía Municipal
        '00074' => '01.03.13.03.02',    // Unidad Funcional de Mercados y Policía Municipal
        '00044' => '01.03.13.04',       // Control Sanitario y Camal Municipal
        '00043' => '01.03.13.05',       // Seguridad Ciudadana
        '00011' => '01.03.14.01',       // Desarrollo Social
        '00045' => '01.03.14.02',       // Educación, Cultura y Deporte
        '00046' => '01.03.14.03.01',    // Programas Sociales y Participación Ciudadana
        '00054' => '01.03.14.03.02',    // Unidad Local de Empadronamiento (SISFOH)
        '00055' => '01.03.14.03.04',    // Programa Vaso de Leche (PVL)
        '00051' => '01.03.14.03.05',    // OMAPED
        '00052' => '01.03.14.03.06',    // CIAM
        '00053' => '01.03.14.03.07',    // DEMUNA
        '00012' => '01.03.15.01',       // Gestión Ambiental
        '00047' => '01.03.15.02',       // Gestión de Residuos Sólidos
        '00048' => '01.03.15.03.01',    // Saneamiento Básico y Área Técnica Municipal
        '00068' => '01.03.15.03.02',    // Área Técnica Municipal
        '00049' => '01.03.15.04',       // Medio Ambiente
    ];

    public function run(): void
    {
        $procesoId = DB::table('procesos_transferencia')->where('anio', 2026)->value('id');

        if ($procesoId === null) {
            $this->command?->warn('No existe el proceso 2026; omitiendo mapeo SIGA.');

            return;
        }

        $actualizadas = 0;
        $noEncontradas = [];

        foreach (self::MAPEO as $codigoSgd => $codigoSiga) {
            $n = DB::table('dependencias')
                ->where('proceso_transferencia_id', $procesoId)
                ->where('codigo', $codigoSgd)
                ->update(['codigo_siga' => $codigoSiga]);

            if ($n > 0) {
                $actualizadas += $n;
            } else {
                $noEncontradas[] = $codigoSgd;
            }
        }

        $this->command?->info("Mapeo SIGA aplicado: {$actualizadas} dependencias con codigo_siga.");

        if ($noEncontradas !== []) {
            $this->command?->warn('Códigos SGD no hallados: '.implode(', ', $noEncontradas));
        }
    }
}

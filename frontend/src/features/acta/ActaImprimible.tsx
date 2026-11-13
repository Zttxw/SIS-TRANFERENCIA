import type { ActaTransferencia, IdentidadInterviniente } from '@/types/acta'
import type { Dependencia } from '@/types/auth'
import type { DependenciaResumen } from '@/types/transferencia'

interface ActaImprimibleProps {
  acta: ActaTransferencia
  dependencia: Dependencia | DependenciaResumen
}

function describirInterviniente(valor: string | IdentidadInterviniente | null | undefined): string {
  if (typeof valor === 'string') return valor
  if (!valor) return ''
  return [valor.nombre, valor.dni ? `DNI ${valor.dni}` : '', valor.cargo].filter(Boolean).join(' · ')
}

export function ActaImprimible({ acta, dependencia }: ActaImprimibleProps) {
  const saliente = describirInterviniente(acta.intervinientes?.titular_saliente)
  const receptor = describirInterviniente(acta.intervinientes?.titular_entrante)
    || describirInterviniente(acta.intervinientes?.coordinador_ette)
    || describirInterviniente(acta.intervinientes?.responsable_superior)
  const fechaObj = new Date(acta.fecha_acta)
  const dia = isNaN(fechaObj.getDate()) ? '__' : fechaObj.getDate()
  const mes = isNaN(fechaObj.getMonth())
    ? '____________'
    : fechaObj.toLocaleDateString('es-PE', { month: 'long' })
  const anio = isNaN(fechaObj.getFullYear()) ? '2026' : fechaObj.getFullYear()

  const anexosLista = [
    {
      codigo: 'Anexo 01',
      nombre: 'Relación de Centros de Costo y Estructura Orgánica Institucional',
      entregado: true,
    },
    {
      codigo: 'Anexo 02',
      nombre: 'Informe de Gestión (Memoria, Funciones, Logros y Dificultades)',
      entregado: !!acta.anexos_entregados?.anexo_02,
    },
    {
      codigo: 'Anexo 03',
      nombre: 'Inventario de Acervo Documental y Archivo de Gestión',
      entregado: !!acta.anexos_entregados?.anexo_03,
    },
    {
      codigo: 'Anexo 04',
      nombre: 'Inventario Físico de Bienes Muebles Patrimoniales (SIGA-MEF)',
      entregado: !!acta.anexos_entregados?.anexo_04,
    },
    {
      codigo: 'Anexo 05',
      nombre: 'Información del Personal a cargo del Centro de Costo (Padrón de Servidores)',
      entregado: !!acta.anexos_entregados?.anexo_05,
    },
    {
      codigo: 'Anexo 06',
      nombre: 'Registro de Bienes No Patrimoniales y Activos Menores',
      entregado: !!acta.anexos_entregados?.anexo_06,
    },
    {
      codigo: 'Anexo 07',
      nombre: 'Acta de Transferencia Administrativa y Entrega de Cargo',
      entregado: true,
    },
  ]

  return (
    <div className="bg-white p-8 md:p-12 text-black print:p-0 print:text-black print:bg-white font-serif text-[13px] leading-relaxed max-w-4xl mx-auto shadow-sm print:shadow-none border print:border-none">
      {/* Membrete Institucional */}
      <div className="text-center border-b pb-4 mb-6">
        <h2 className="font-bold text-sm tracking-wider uppercase">
          Municipalidad Distrital de San Jerónimo - Cusco
        </h2>
        <h3 className="text-xs uppercase tracking-normal text-gray-700">
          Comisión Institucional de Transferencia de Gestión 2026
        </h3>
        <p className="text-[11px] italic text-gray-500">
          Directiva N.° 001-2026-MDSJ/A · Aprobada por Resolución de Alcaldía
        </p>
      </div>

      {/* Título Principal */}
      <div className="text-center my-6 space-y-1">
        <h1 className="font-bold text-base md:text-lg uppercase underline decoration-1 underline-offset-4">
          ANEXO N° 07: ACTA DE TRANSFERENCIA ADMINISTRATIVA DE GESTIÓN Y ENTREGA DE CARGO
        </h1>
        <p className="font-mono text-xs font-semibold tracking-wide">
          N.° DE ACTA: {acta.numero_acta}
        </p>
      </div>

      {/* Identificación del Centro de Costo */}
      <div className="border border-gray-400 p-4 mb-6 space-y-2 text-xs bg-gray-50/50 print:bg-transparent">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <span className="font-bold">CENTRO DE COSTO: </span>
            <span className="uppercase">{dependencia.nombre}</span>
          </div>
          <div>
            <span className="font-bold">CÓDIGO INSTITUCIONAL: </span>
            <span className="font-mono font-semibold">{dependencia.codigo}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 border-t border-gray-300">
          <div>
            <span className="font-bold">NIVEL ORGANIZACIONAL: </span>
            <span>Nivel {dependencia.nivel} {dependencia.parent_id === null ? '(Órgano de 1er Nivel)' : '(Unidad Orgánica Subordinada)'}</span>
          </div>
          <div>
            <span className="font-bold">UNIDAD DE LA CUAL DEPENDE: </span>
            <span>{acta.dependencia?.padre?.nombre ?? (dependencia.parent_id ? 'Unidad inmediata superior' : 'Alcaldía / ETTS Institucional')}</span>
          </div>
        </div>
      </div>

      {/* Preámbulo Legal */}
      <p className="text-justify mb-4">
        En el distrito de San Jerónimo de la ciudad de Cusco, a los <strong>{dia}</strong> días del mes de <strong>{mes}</strong> del año <strong>{anio}</strong>, en las instalaciones de la Municipalidad Distrital de San Jerónimo, se reúnen los intervinientes responsables de la Transferencia Administrativa de Gestión y Entrega de Cargo del Centro de Costo señalado precedentemente, en cumplimiento de los lineamientos establecidos en la Directiva N.° 001-2026-MDSJ/A y la normativa aplicable del Sistema Nacional de Control.
      </p>

      {/* Sección I y II: Intervinientes */}
      <div className="space-y-3 mb-6">
        <div>
          <h4 className="font-bold uppercase text-xs">I. RESPONSABLE QUE EFECTÚA LA ENTREGA:</h4>
          <p className="text-justify pl-4 text-xs mt-0.5">
            {saliente || 'Servidor / Funcionario Responsable acreditado del Centro de Costo saliente.'}
          </p>
        </div>

        <div>
          <h4 className="font-bold uppercase text-xs">II. RESPONSABLE DE LA RECEPCIÓN / VERIFICACIÓN:</h4>
          <p className="text-justify pl-4 text-xs mt-0.5">
            {receptor
              ? receptor
              : dependencia.parent_id === null
                ? 'Coordinador acreditado por el Equipo de Trabajo de Transferencia (ETTS) de la Municipalidad Distrital de San Jerónimo.'
                : 'Responsable de la Unidad Inmediata Superior / Revisor Jerárquico.'}
          </p>
        </div>
      </div>

      {/* Sección III: Anexos Entregados */}
      <div className="mb-6">
        <h4 className="font-bold uppercase text-xs mb-2">III. INFORMACIÓN Y DOCUMENTACIÓN ENTREGADA:</h4>
        <p className="text-xs mb-2 text-justify">
          Se deja expresa constancia de la documentación y los formatos verificados y presentados en el Sistema Institucional de Transferencia:
        </p>
        <div className="overflow-hidden border border-gray-400">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100 print:bg-gray-200 border-b border-gray-400">
                <th className="py-1.5 px-3 font-bold w-24">Formato</th>
                <th className="py-1.5 px-3 font-bold">Denominación del Formato Oficial</th>
                <th className="py-1.5 px-3 font-bold text-center w-28">Estado Entrega</th>
              </tr>
            </thead>
            <tbody>
              {anexosLista.map((item, idx) => (
                <tr key={item.codigo} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50 print:bg-transparent'}>
                  <td className="py-1.5 px-3 font-mono font-semibold border-t border-gray-300">{item.codigo}</td>
                  <td className="py-1.5 px-3 border-t border-gray-300">{item.nombre}</td>
                  <td className="py-1.5 px-3 text-center border-t border-gray-300 font-bold">
                    {item.entregado ? (
                      <span className="text-emerald-800">[ CONSIGNADO ]</span>
                    ) : (
                      <span className="text-gray-500">[ NO APLICA ]</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sección IV: Observaciones */}
      <div className="mb-8">
        <h4 className="font-bold uppercase text-xs mb-1">IV. OBSERVACIONES Y CONSTANCIA DE REVISIÓN:</h4>
        <p className="text-justify text-xs pl-4">
          {acta.observaciones
            ? acta.observaciones
            : acta.declara === 'recepcion_consolidacion'
              ? 'Se deja constancia de la recepción y consolidación de la entrega por la dependencia superior.'
              : 'Se deja constancia de la preparación de la documentación para su suscripción y remisión a la dependencia superior. La recepción y revisión jerárquica se encuentran pendientes.'}
        </p>
      </div>

      {/* Cierre */}
      <p className="text-justify mb-16 text-xs">
        En constancia de lo actuado y en señal de plena conformidad con la información, documentación y acervo entregado y recibido, los intervinientes suscriben la presente Acta de Transferencia Administrativa de Gestión y Entrega de Cargo.
      </p>

      {/* Bloque de Firmas */}
      <div className="grid grid-cols-2 gap-12 text-center text-xs pt-8">
        <div className="border-t border-gray-700 pt-2">
          <p className="font-bold uppercase">ENTREGUÉ CONFORME</p>
          <p className="mt-1">Responsable del Centro de Costo</p>
          {saliente && <p className="mt-1">{saliente}</p>}
          <p className="text-[11px] text-gray-600">Firma, Posfirma y Sello</p>
        </div>

        <div className="border-t border-gray-700 pt-2">
          <p className="font-bold uppercase">RECIBÍ CONFORME</p>
          <p className="mt-1">
            {dependencia.parent_id === null ? 'Coordinador ETTS / Comisión' : 'Responsable Unidad Superior'}
          </p>
          {receptor && <p className="mt-1">{receptor}</p>}
          <p className="text-[11px] text-gray-600">Firma, Posfirma y Sello</p>
        </div>
      </div>
    </div>
  )
}


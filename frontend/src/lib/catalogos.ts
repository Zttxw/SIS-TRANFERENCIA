/**
 * Catálogos de dominio centralizados (F3, plan-mejoras-frontend §4).
 *
 * Única fuente de verdad para los valores de enumeración que antes vivían
 * hardcodeados dentro de cada modal (regímenes laborales, unidades de
 * conservación, estados de conservación, etc.). Se consumen desde los `<Select>`
 * y los `zod` de los formularios de anexo.
 *
 * Forma: `OpcionCatalogo[]` = `{ value, label, descripcion? }`, directamente
 * compatible con la primitiva `<Select>` (`ui/select`). Si en el futuro algún
 * catálogo pasa a servirse desde el backend, basta sustituir el arreglo por una
 * query manteniendo la misma forma.
 */

export interface OpcionCatalogo {
  value: string
  label: string
  descripcion?: string
}

/** Extrae el union de `value`s de un catálogo literal para usarlo en zod/tipos. */
export type ValoresDe<T extends readonly OpcionCatalogo[]> = T[number]['value']

/**
 * Convierte un catálogo (posiblemente `readonly` y con `value` literal) en el
 * arreglo mutable `{ value, label }[]` que espera la primitiva `<Select>`.
 * Evita los casts `as unknown as` en cada formulario.
 */
export function aOpcionesSelect<V extends string = string>(
  catalogo: readonly OpcionCatalogo[],
): { value: V; label: string }[] {
  return catalogo.map((o) => ({ value: o.value as V, label: o.label }))
}

// ─────────────────────────────────────────────────────────────────────────────
// Anexo 05 — Personal
// ─────────────────────────────────────────────────────────────────────────────

/** Regímenes laborales del sector público peruano (Anexo 05). */
export const REGIMENES_LABORALES = [
  { value: 'D.L. 1057 (CAS)', label: 'D.L. 1057 (CAS)' },
  { value: 'D.L. 276 (Carrera Administrativa)', label: 'D.L. 276 (Carrera Administrativa)' },
  { value: 'D.L. 728 (Régimen Privado)', label: 'D.L. 728 (Régimen Privado)' },
  { value: 'Locación de Servicios (FTH)', label: 'Locación de Servicios (FTH)' },
  { value: 'Designación de Confianza', label: 'Designación de Confianza' },
  { value: 'Otro', label: 'Otro' },
] as const satisfies readonly OpcionCatalogo[]

/** Situación laboral del servidor al momento de la transferencia (Anexo 05). */
export const SITUACIONES_LABORALES = [
  { value: 'ACTIVO', label: 'Activo' },
  { value: 'VACACIONES', label: 'Vacaciones' },
  { value: 'LICENCIA', label: 'Licencia' },
  { value: 'DESTAQUE', label: 'Destaque' },
] as const satisfies readonly OpcionCatalogo[]

// ─────────────────────────────────────────────────────────────────────────────
// Anexo 03 — Acervo documental
// ─────────────────────────────────────────────────────────────────────────────

/** Secciones del Anexo 03: A digital (SGD) y B física (registro manual). */
export const SECCIONES_ACERVO = [
  { value: 'digital', label: 'A. Acervo digital (SGD)' },
  { value: 'fisico', label: 'B. Acervo físico' },
] as const satisfies readonly OpcionCatalogo[]

/** Rótulo de volumen por sección: A (SGD) en documentos; B (física) en folios. */
export const ETIQUETA_CANTIDAD_ACERVO = {
  digital: 'N° documentos',
  fisico: 'Folios',
} as const satisfies Record<(typeof SECCIONES_ACERVO)[number]['value'], string>

/** Tipos de unidades de conservación del formato oficial del Anexo 03. */
export const UNIDADES_CONSERVACION = [
  { value: 'Archivadores de Palanca', label: 'Archivadores de Palanca' },
  { value: 'Paquetes', label: 'Paquetes' },
  { value: 'Empastados', label: 'Empastados' },
  { value: 'Fólderes', label: 'Fólderes' },
  { value: 'Cajas Archivadoras', label: 'Cajas Archivadoras' },
  { value: 'Archivo Digital', label: 'Archivo Digital' },
  { value: 'Otro', label: 'Otro (especificar)' },
] as const satisfies readonly OpcionCatalogo[]

// ─────────────────────────────────────────────────────────────────────────────
// Anexo 06 — Bienes no patrimoniales (y verificación de estado)
// ─────────────────────────────────────────────────────────────────────────────

/** Estados de conservación de un bien (Anexo 06). */
export const ESTADOS_CONSERVACION = [
  { value: 'bueno', label: 'Bueno' },
  { value: 'regular', label: 'Regular' },
  { value: 'malo', label: 'Malo' },
  { value: 'inservible', label: 'Inservible / De baja' },
] as const satisfies readonly OpcionCatalogo[]

/** Unidades de medida frecuentes para bienes no patrimoniales (Anexo 06). */
export const UNIDADES_MEDIDA = [
  { value: 'UNIDAD', label: 'Unidad' },
  { value: 'PAQUETE', label: 'Paquete' },
  { value: 'JUEGO', label: 'Juego' },
  { value: 'CAJA', label: 'Caja' },
  { value: 'MILLAR', label: 'Millar' },
  { value: 'METRO', label: 'Metro' },
] as const satisfies readonly OpcionCatalogo[]

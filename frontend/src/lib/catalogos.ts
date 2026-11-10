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

/** Formato del acervo documental (Anexo 03). */
export const TIPOS_ACERVO = [
  { value: 'fisico', label: 'Físico (Papel / Archivadores)' },
  { value: 'digital', label: 'Digital (Repositorios / Nube)' },
] as const satisfies readonly OpcionCatalogo[]

/** Unidades de conservación sugeridas para el acervo físico (Anexo 03). */
export const UNIDADES_CONSERVACION = [
  { value: 'Archivadores de Palanca', label: 'Archivadores de Palanca' },
  { value: 'Tomos / Archivadores', label: 'Tomos / Archivadores' },
  { value: 'Folders', label: 'Folders' },
  { value: 'Cajas de archivo', label: 'Cajas de archivo' },
  { value: 'Legajos', label: 'Legajos' },
  { value: 'GB', label: 'GB (digital)' },
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

/**
 * Tipos del contrato de la API — espejo del wrapper
 * `App\Support\Http\ApiResponse` del backend (plan §4).
 *
 * Todas las respuestas del backend usan uno de estos envoltorios. Tipar aquí
 * la frontera de la API: nada de `any` cruza este límite (plan §8).
 */

/** Respuesta de éxito simple: `{ success, message, data }`. */
export interface ApiSuccess<T> {
  success: true
  message?: string
  data: T
}

/** Metadatos de paginación de Laravel (listados de anexos). */
export interface PaginationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from?: number
  to?: number
}

/** Respuesta paginada: `{ success, data: T[], meta }`. */
export interface ApiPaginated<T> {
  success: true
  message?: string
  data: T[]
  meta: PaginationMeta
}

/** Cuerpo de error del backend: `{ success:false, message, errors? }`. */
export interface ApiErrorBody {
  success: false
  message: string
  /** Presente solo en 422: mapa campo -> mensajes de validación. */
  errors?: Record<string, string[]>
}

/**
 * Error normalizado que emite el interceptor de axios (src/lib/api.ts).
 * La UI reacciona según `status`:
 *  - 401 -> sesión caducada (el interceptor ya limpia y redirige)
 *  - 403 -> fuera de ámbito / sin permiso -> toast, no romper la app
 *  - 409 -> conflicto de estado del flujo -> mostrar `message` tal cual (RN-13)
 *  - 422 -> validación -> mapear `errors` a los campos del formulario
 */
export class ApiError extends Error {
  readonly status: number
  readonly errors?: Record<string, string[]>
  readonly isNetworkError: boolean
  /**
   * Cuerpo crudo de la respuesta de error. Normalmente innecesario, pero en
   * descargas (`responseType: 'blob'`) el backend devuelve el error como Blob
   * sin parsear; se conserva aquí para decodificarlo (ver lib/descargas.ts).
   */
  readonly data?: unknown

  constructor(params: {
    status: number
    message: string
    errors?: Record<string, string[]>
    isNetworkError?: boolean
    data?: unknown
  }) {
    super(params.message)
    this.name = 'ApiError'
    this.status = params.status
    this.errors = params.errors
    this.isNetworkError = params.isNetworkError ?? false
    this.data = params.data
  }

  get esNoAutorizado(): boolean {
    return this.status === 401
  }

  get esProhibido(): boolean {
    return this.status === 403
  }

  /** Conflicto de estado del flujo (p. ej. editar entrega remitida). */
  get esConflictoFlujo(): boolean {
    return this.status === 409
  }

  get esValidacion(): boolean {
    return this.status === 422
  }
}

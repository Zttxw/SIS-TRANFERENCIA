<?php

declare(strict_types=1);

namespace App\Support\Enums;

/**
 * El acervo documentario se entrega en dos documentos independientes, cada uno
 * con su pantalla, su PDF, sus firmas y su ítem en el Acta 07:
 * - FISICO (Anexo 03-A): series que el centro de costo registra a mano,
 *   medidas en folios.
 * - DIGITAL (Anexo 03-B): series precargadas del SGD (tipo documental +
 *   emitidos/recibidos), medidas en número de documentos y de solo lectura.
 */
enum TipoAcervo: string
{
    case FISICO = 'fisico';
    case DIGITAL = 'digital';

    /** Número del anexo, p. ej. «Anexo 03-A». */
    public function anexo(): string
    {
        return match ($this) {
            self::FISICO => 'Anexo 03-A',
            self::DIGITAL => 'Anexo 03-B',
        };
    }

    /** Denominación oficial del documento. */
    public function titulo(): string
    {
        return match ($this) {
            self::FISICO => 'Registro del Acervo Documentario Físico',
            self::DIGITAL => 'Registro del Acervo Documentario Digital (SGD)',
        };
    }

    /** Encabezado de la columna de cantidad del PDF. */
    public function columnaCantidad(): string
    {
        return match ($this) {
            self::FISICO => 'Folios',
            self::DIGITAL => 'N° de Documentos',
        };
    }

    /** Tipo de documento en la cadena de firmas (Firma Perú). */
    public function tipoDocumento(): string
    {
        return match ($this) {
            self::FISICO => 'anexo03a',
            self::DIGITAL => 'anexo03b',
        };
    }

    /** Ítem de la sección III del Acta 07 y del índice del expediente. */
    public function itemActa(): string
    {
        return match ($this) {
            self::FISICO => 'anexo_03a',
            self::DIGITAL => 'anexo_03b',
        };
    }

    /** Clave del anexo en las observaciones del coordinador ETTE. */
    public function claveObservacion(): string
    {
        return match ($this) {
            self::FISICO => 'acervo_fisico',
            self::DIGITAL => 'acervo_digital',
        };
    }

    /** Fragmento del nombre de archivo del PDF. */
    public function sufijoArchivo(): string
    {
        return match ($this) {
            self::FISICO => '03A-Acervo-fisico',
            self::DIGITAL => '03B-Acervo-digital',
        };
    }
}

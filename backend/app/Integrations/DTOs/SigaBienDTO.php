<?php

declare(strict_types=1);

namespace App\Integrations\DTOs;

/**
 * Data Transfer Object que normaliza un registro patrimonial obtenido de SIGA.
 */
readonly class SigaBienDTO
{
    public function __construct(
        public string $codigoPatrimonial,
        public string $descripcion,
        public ?string $marca,
        public ?string $modelo,
        public ?string $serie,
        public ?string $color,
        public ?string $estadoConservacion,
        public ?float $valorAdquisicion,
        public ?string $codigoCentroCosto,
        public ?string $nombreCentroCosto,
        public ?string $dniResponsable,
        public ?string $nombreResponsable,
        public ?string $ubicacionFisica,
        public ?string $estadoActual,
        public array $rawAttributes = [],
    ) {}

    public static function fromSigaRecord(object $record): self
    {
        return new self(
            codigoPatrimonial: (string)($record->CODIGO_PATRIMONIAL ?? $record->codigo_patrimonial ?? ''),
            descripcion: trim((string)($record->DESCRIPCION ?? $record->descripcion ?? '')),
            marca: isset($record->MARCA) ? trim((string)$record->MARCA) : null,
            modelo: isset($record->MODELO) ? trim((string)$record->MODELO) : null,
            serie: isset($record->SERIE) ? trim((string)$record->SERIE) : null,
            color: isset($record->COLOR) ? trim((string)$record->COLOR) : null,
            estadoConservacion: isset($record->ESTADO_CONSERV) ? (string)$record->ESTADO_CONSERV : null,
            valorAdquisicion: isset($record->VALOR_ADQ) ? (float)$record->VALOR_ADQ : null,
            codigoCentroCosto: isset($record->CENTRO_COSTO) ? (string)$record->CENTRO_COSTO : null,
            nombreCentroCosto: isset($record->NOMBRE_DEPEND) ? (string)$record->NOMBRE_DEPEND : null,
            dniResponsable: isset($record->EMPLEADO) ? (string)$record->EMPLEADO : null,
            nombreResponsable: isset($record->RESPONSABLE) ? (string)$record->RESPONSABLE : null,
            ubicacionFisica: isset($record->UBICACION) ? (string)$record->UBICACION : null,
            estadoActual: isset($record->ESTADO_ACTUAL) ? (string)$record->ESTADO_ACTUAL : null,
            rawAttributes: (array)$record,
        );
    }

    public function toArray(): array
    {
        return [
            'codigo_patrimonial' => $this->codigoPatrimonial,
            'descripcion' => $this->descripcion,
            'marca' => $this->marca,
            'modelo' => $this->modelo,
            'serie' => $this->serie,
            'color' => $this->color,
            'estado_conservacion' => $this->estadoConservacion,
            'valor_adquisicion' => $this->valorAdquisicion,
            'codigo_centro_costo' => $this->codigoCentroCosto,
            'nombre_centro_costo' => $this->nombreCentroCosto,
            'dni_responsable' => $this->dniResponsable,
            'nombre_responsable' => $this->nombreResponsable,
            'ubicacion_fisica' => $this->ubicacionFisica,
            'estado_actual' => $this->estadoActual,
        ];
    }
}


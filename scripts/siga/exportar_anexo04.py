exportar_anexo04.py
#!/usr/bin/env python3

from app.siga.conexion import get_pyodbc_connection
from pathlib import Path
from datetime import datetime, date
from decimal import Decimal
import sqlite3
import sys


TABLAS_OBLIGATORIAS = [
    "SIG_PATRIMONIO",
    "SIG_CENTRO_COSTO",
    "MARCA",
    "SIG_UBICAC_FISICA",
    "SIG_PERSONAL",
    "SIG_ASIGNACIONES",
]

TABLAS_COMPLEMENTARIAS = [
    "SIG_MOVIM_ASIGNACION",
    "SIG_ESPECIF_TECNICA_ACTIVO",
    "SIG_MAESTRO_ESTADO",
    "SIG_CAUSAL_BAJA",
    "SIG_MOVIM_PATRIMONIO",
]

BATCH_SIZE = 1000


def convertir(valor):
    if valor is None:
        return None
    if isinstance(valor, datetime):
        return valor.isoformat(sep=" ")
    if isinstance(valor, date):
        return valor.isoformat()
    if isinstance(valor, Decimal):
        return str(valor)
    if isinstance(valor, memoryview):
        return valor.tobytes()
    if isinstance(valor, bytearray):
        return bytes(valor)
    if isinstance(valor, (str, int, float, bytes)):
        return valor
    return str(valor)


def escapar_sql(nombre):
    return "[" + str(nombre).replace("]", "]]") + "]"


def escapar_sqlite(nombre):
    return '"' + str(nombre).replace('"', '""') + '"'


def tipo_sqlite(tipo):
    tipo = tipo.lower()

    if tipo in ("bit", "tinyint", "smallint", "int", "bigint"):
        return "INTEGER"

    if tipo in ("float", "real"):
        return "REAL"

    if tipo in ("binary", "varbinary", "image",
                "timestamp", "rowversion"):
        return "BLOB"

    return "TEXT"
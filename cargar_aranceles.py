"""
Script de carga de aranceles desde Excel a PostgreSQL
Uso: python cargar_aranceles.py ARANCELES_CAPITULO_1.xlsx
     python cargar_aranceles.py  (carga todos los xlsx de la carpeta actual)
"""

import os
import sys
import django
import pandas as pd
from decimal import Decimal, InvalidOperation

# ── Configuración Django ──────────────────────────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.postgres.search import SearchVector
from api.models import ArancelBusquedaCompleta


# ── Helpers ───────────────────────────────────────────────────────────────────

def limpiar_codigo(codigo: str) -> str:
    """Quita puntos y espacios de un código arancelario."""
    return str(codigo).replace('.', '').replace(' ', '').strip()


def derivar_jerarquia(codigo_nacional: str):
    """
    A partir del código nacional (10 dígitos sin puntos) deriva:
    capitulo (2), subpartida_sa (6), nandina (8)
    """
    c = limpiar_codigo(codigo_nacional)
    return {
        'codigo_capitulo':    c[:2],
        'codigo_partida':     c[:4],
        'codigo_subpartida':  c[:6],
        'codigo_nandina':     c[:8],
        'codigo_nacional':    c,
    }


def limpiar_decimal(valor):
    """Convierte un valor a Decimal o retorna None."""
    if pd.isna(valor) or str(valor).strip() in ('', '-', 'nan'):
        return None
    try:
        return Decimal(str(valor).strip().replace('%', ''))
    except InvalidOperation:
        return None


def limpiar_texto(valor):
    """Limpia texto o retorna None."""
    if pd.isna(valor) or str(valor).strip() in ('', '-', 'nan', 'NaN'):
        return None
    return str(valor).strip()


# ── Lógica principal de carga ─────────────────────────────────────────────────

def procesar_excel(ruta: str, capitulo: str = '01', seccion: str = 'I'):
    """
    Lee un Excel de aranceles y carga los registros en ArancelBusquedaCompleta.
    Retorna (insertados, actualizados, errores).
    """
    df = pd.read_excel(ruta, dtype=str)
    df.columns = df.columns.str.strip()

    insertados = 0
    actualizados = 0
    errores = []

    # Contexto acumulado para enriquecer descripciones
    descripcion_partida_actual = ''
    descripcion_capitulo = f'Capítulo {capitulo}'
    descripcion_seccion = f'Sección {seccion}'

    for idx, fila in df.iterrows():
        nivel = limpiar_texto(fila.get('Nivel Jerárquico', ''))
        codigo_raw = limpiar_texto(fila.get('Código Arancelario', ''))
        descripcion = limpiar_texto(fila.get('Descripción de la Mercancía', ''))

        # Acumular descripción de partida para enriquecer búsqueda
        if nivel == 'Partida':
            descripcion_partida_actual = descripcion or ''
            continue  # Las partidas no se insertan directamente

        if nivel in ('Agrupación', 'Subpartida SA', 'NANDINA'):
            continue  # Solo son contexto jerárquico, no se insertan

        if nivel != 'Sub. Nacional':
            continue

        if not codigo_raw:
            errores.append(f"Fila {idx+2}: Sin código en Sub. Nacional")
            continue

        try:
            jerarquia = derivar_jerarquia(codigo_raw)
        except Exception as e:
            errores.append(f"Fila {idx+2}: Error derivando jerarquía de '{codigo_raw}': {e}")
            continue

        ga = limpiar_decimal(fila.get('GA %'))
        if ga is None:
            errores.append(f"Fila {idx+2}: GA% vacío en {codigo_raw}, se asigna 0")
            ga = Decimal('0')

        datos = {
            'codigo_nandina':            jerarquia['codigo_nandina'],
            'codigo_subpartida':         jerarquia['codigo_subpartida'],
            'codigo_partida':            jerarquia['codigo_partida'],
            'codigo_capitulo':           jerarquia['codigo_capitulo'],
            'id_seccion':                seccion,
            'descripcion_mercancia':     descripcion or '',
            'descripcion_capitulo':      descripcion_capitulo,
            'descripcion_seccion':       descripcion_seccion,
            'ga_porcentaje':             ga,
            'ice_porcentaje':            limpiar_decimal(fila.get('ICE')),
            'iehd':                      None,
            'unidad_medida':             limpiar_texto(fila.get('U. Medida')),
            'documento_adicional':       limpiar_texto(fila.get('Doc. Adicional (Tipo)')),
            'preferencia_arancelaria_ace': limpiar_texto(fila.get('Preferencias (CAN / ACE 36 / VEN)')),
        }

        obj, creado = ArancelBusquedaCompleta.objects.update_or_create(
            codigo_nacional=jerarquia['codigo_nacional'],
            defaults=datos
        )

        if creado:
            insertados += 1
        else:
            actualizados += 1

    return insertados, actualizados, errores


def actualizar_search_vectors():
    """Actualiza el search_vector de todos los registros."""
    print("  Actualizando search vectors en PostgreSQL...")
    ArancelBusquedaCompleta.objects.update(
        search_vector=SearchVector(
            'descripcion_mercancia',
            'descripcion_capitulo',
            'descripcion_seccion',
            'documento_adicional',
            'preferencia_arancelaria_ace',
            config='spanish'
        )
    )


# ── Ejecución ─────────────────────────────────────────────────────────────────

def main():
    # Determinar archivos a procesar
    if len(sys.argv) > 1:
        archivos = sys.argv[1:]
    else:
        archivos = [f for f in os.listdir('.') if f.endswith('.xlsx')]

    if not archivos:
        print("No se encontraron archivos .xlsx")
        sys.exit(1)

    total_insertados = 0
    total_actualizados = 0
    total_errores = []

    for archivo in archivos:
        if not os.path.exists(archivo):
            print(f"⚠️  Archivo no encontrado: {archivo}")
            continue

        # Detectar capítulo del nombre del archivo (ej: ARANCELES_CAPITULO_1.xlsx)
        nombre = os.path.basename(archivo).upper()
        capitulo = '01'
        for part in nombre.replace('_', ' ').split():
            if part.isdigit():
                capitulo = part.zfill(2)
                break

        print(f"\n📂 Procesando: {archivo} (Capítulo {capitulo})")
        ins, act, errs = procesar_excel(archivo, capitulo=capitulo)

        print(f"  ✅ Insertados:   {ins}")
        print(f"  🔄 Actualizados: {act}")
        if errs:
            print(f"  ⚠️  Advertencias: {len(errs)}")
            for e in errs:
                print(f"     - {e}")

        total_insertados += ins
        total_actualizados += act
        total_errores.extend(errs)

    actualizar_search_vectors()

    print(f"\n{'='*50}")
    print(f"RESUMEN FINAL")
    print(f"  Total insertados:   {total_insertados}")
    print(f"  Total actualizados: {total_actualizados}")
    print(f"  Total advertencias: {len(total_errores)}")
    print(f"{'='*50}")
    print("✅ Carga completada. Search vectors actualizados.")


if __name__ == '__main__':
    main()
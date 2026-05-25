"""
Script de carga del árbol arancelario desde JSON a NomenclaturaArancelaria.
Uso: python cargar_nomenclatura.py arancel_capitulo_01.json
     python cargar_nomenclatura.py  (carga todos los .json de la carpeta)
"""

import os
import sys
import json
import django
from decimal import Decimal, InvalidOperation

# ── Configuración Django ──────────────────────────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import NomenclaturaArancelaria


# ── Helpers ───────────────────────────────────────────────────────────────────

def a_decimal(valor):
    if valor is None:
        return None
    try:
        return Decimal(str(valor))
    except InvalidOperation:
        return None


def limpiar_descripcion(desc):
    """Quita guiones y espacios del inicio de la descripción."""
    if not desc:
        return ''
    return desc.lstrip('- ').strip()


# ── Inserción recursiva del árbol ─────────────────────────────────────────────

def insertar_nodo(nodo, parent=None, orden=0):
    """
    Inserta un nodo y todos sus hijos recursivamente.
    Retorna el objeto creado.
    """
    obj = NomenclaturaArancelaria.objects.create(
        parent=parent,
        nivel=nodo.get('nivel', 'AGRUPACION'),
        codigo_oficial=nodo.get('codigo_oficial'),
        descripcion=nodo.get('descripcion', ''),
        orden=orden,
        is_leaf=nodo.get('is_leaf', False),
        ga_porcentaje=a_decimal(nodo.get('ga_porcentaje')),
        ice_porcentaje=a_decimal(nodo.get('ice_porcentaje')),
        unidad_medida=nodo.get('unidad_medida'),
        doc_adicional=nodo.get('doc_adicional'),
        preferencias=nodo.get('preferencias'),
    )

    # Insertar hijos recursivamente
    for i, hijo in enumerate(nodo.get('children', [])):
        insertar_nodo(hijo, parent=obj, orden=i)

    return obj


def cargar_json(ruta):
    """Carga un archivo JSON y retorna (insertados, errores)."""
    with open(ruta, encoding='utf-8') as f:
        datos = json.load(f)

    if not isinstance(datos, list):
        datos = [datos]

    insertados = 0
    errores = []

    for i, nodo_raiz in enumerate(datos):
        codigo = nodo_raiz.get('codigo_oficial') or nodo_raiz.get('id', '?')

        # Verificar si ya existe para no duplicar
        existe = NomenclaturaArancelaria.objects.filter(
            codigo_oficial=codigo,
            nivel=nodo_raiz.get('nivel', 'CAPITULO'),
            parent=None
        ).first()

        if existe:
            print(f"  ⚠️  Ya existe: {codigo} — omitiendo (borra manualmente si quieres recargar)")
            continue

        try:
            insertar_nodo(nodo_raiz, parent=None, orden=i)
            insertados += 1
            print(f"  ✅ Insertado: [{nodo_raiz.get('nivel')}] {codigo} — {nodo_raiz.get('descripcion', '')[:40]}")
        except Exception as e:
            errores.append(f"Error en nodo {codigo}: {e}")
            print(f"  ❌ Error en {codigo}: {e}")

    return insertados, errores


# ── Ejecución ─────────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) > 1:
        archivos = sys.argv[1:]
    else:
        archivos = [f for f in os.listdir('.') if f.endswith('.json')]

    if not archivos:
        print("No se encontraron archivos .json")
        sys.exit(1)

    total_insertados = 0
    total_errores = []

    for archivo in archivos:
        if not os.path.exists(archivo):
            print(f"⚠️  Archivo no encontrado: {archivo}")
            continue

        print(f"\n📂 Procesando: {archivo}")
        ins, errs = cargar_json(archivo)
        total_insertados += ins
        total_errores.extend(errs)

    print(f"\n{'='*50}")
    print(f"RESUMEN FINAL")
    print(f"  Capítulos insertados: {total_insertados}")
    print(f"  Errores:              {len(total_errores)}")
    print(f"{'='*50}")

    # Estadísticas de la tabla
    total = NomenclaturaArancelaria.objects.count()
    hojas = NomenclaturaArancelaria.objects.filter(is_leaf=True).count()
    print(f"\n📊 Estado de la tabla:")
    print(f"  Total nodos:     {total}")
    print(f"  Nodos hoja:      {hojas}")
    print(f"  Nodos de árbol:  {total - hojas}")
    print(f"\n✅ Carga completada.")


if __name__ == '__main__':
    main()
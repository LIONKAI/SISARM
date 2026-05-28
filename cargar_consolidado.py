"""
Script de carga del árbol arancelario al modelo consolidado.
Uso: python cargar_consolidado.py arancel_01.json arancel_02.json arancel_03.json
"""

import os
import sys
import json
import django
from decimal import Decimal, InvalidOperation

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import (
    Capitulo, NomenclaturaArancelaria,
    DocumentoAdicional, PreferenciaArancelaria
)


def a_decimal(valor):
    if valor is None:
        return None
    try:
        return Decimal(str(valor))
    except InvalidOperation:
        return None


def insertar_nodo(nodo, capitulo_obj, parent=None, orden=0):
    """Inserta un nodo y sus hijos recursivamente."""
    obj = NomenclaturaArancelaria.objects.create(
        capitulo=capitulo_obj,
        parent=parent,
        nivel=nodo.get('nivel', 'AGRUPACION'),
        codigo_oficial=nodo.get('codigo_oficial'),
        descripcion=nodo.get('descripcion', ''),
        orden=orden,
        is_leaf=nodo.get('is_leaf', False),
        ga_porcentaje=a_decimal(nodo.get('ga_porcentaje')),
        ice_iehd=nodo.get('ice_iehd'),
        unidad_medida=nodo.get('unidad_medida'),
        despacho_frontera=nodo.get('despacho_frontera'),
        notas_explicativas=nodo.get('notas_explicativas'),
    )

    # Insertar documentos adicionales (solo hojas)
    for doc in nodo.get('documentos_adicionales', []):
        DocumentoAdicional.objects.create(
            nomenclatura=obj,
            tipo_doc=doc.get('tipo_doc', ''),
            entidad_emisora=doc.get('entidad_emisora', ''),
            disposicion_legal=doc.get('disposicion_legal'),
        )

    # Insertar preferencias arancelarias (solo hojas)
    for pref in nodo.get('preferencias', []):
        porcentaje = a_decimal(pref.get('porcentaje_desgravacion'))
        if porcentaje is not None:
            PreferenciaArancelaria.objects.create(
                nomenclatura=obj,
                tipo_acuerdo=pref.get('tipo_acuerdo', ''),
                porcentaje_desgravacion=porcentaje,
            )

    # Insertar hijos recursivamente (skip el nodo raíz CAPITULO)
    for i, hijo in enumerate(nodo.get('children', [])):
        insertar_nodo(hijo, capitulo_obj, parent=obj, orden=i)

    return obj


def cargar_json(ruta):
    with open(ruta, encoding='utf-8') as f:
        datos = json.load(f)

    raices = datos if isinstance(datos, list) else [datos]

    for nodo_raiz in raices:
        codigo = nodo_raiz.get('codigo_oficial', '').zfill(2)
        descripcion = nodo_raiz.get('descripcion', '')

        # Verificar si ya existe
        if Capitulo.objects.filter(codigo=codigo).exists():
            print(f"  ⚠️  Capítulo {codigo} ya existe — omitiendo")
            continue

        # Crear el capítulo
        capitulo_obj = Capitulo.objects.create(
            codigo=codigo,
            descripcion=descripcion,
            notas_legales=nodo_raiz.get('notas_legales'),
            seccion=nodo_raiz.get('seccion', 'I'),
        )
        print(f"  ✅ Capítulo {codigo} creado: {descripcion[:50]}")

        # Insertar los hijos del capítulo
        for i, hijo in enumerate(nodo_raiz.get('children', [])):
            insertar_nodo(hijo, capitulo_obj, parent=None, orden=i)

    # Estadísticas
    total = NomenclaturaArancelaria.objects.filter(
        capitulo__codigo=codigo
    ).count()
    hojas = NomenclaturaArancelaria.objects.filter(
        capitulo__codigo=codigo, is_leaf=True
    ).count()
    docs = DocumentoAdicional.objects.filter(
        nomenclatura__capitulo__codigo=codigo
    ).count()
    prefs = PreferenciaArancelaria.objects.filter(
        nomenclatura__capitulo__codigo=codigo
    ).count()

    print(f"     Nodos: {total} | Hojas: {hojas} | Docs: {docs} | Prefs: {prefs}")


def main():
    if len(sys.argv) > 1:
        archivos = sys.argv[1:]
    else:
        archivos = sorted([f for f in os.listdir('.') if f.startswith('arancel_') and f.endswith('.json')])

    if not archivos:
        print("No se encontraron archivos JSON")
        sys.exit(1)

    total_caps = 0
    for archivo in archivos:
        if not os.path.exists(archivo):
            print(f"⚠️  No encontrado: {archivo}")
            continue
        print(f"\n📂 Procesando: {archivo}")
        cargar_json(archivo)
        total_caps += 1

    print(f"\n{'='*55}")
    print(f"RESUMEN FINAL")
    print(f"  Capítulos:      {Capitulo.objects.count()}")
    print(f"  Nodos totales:  {NomenclaturaArancelaria.objects.count()}")
    print(f"  Hojas:          {NomenclaturaArancelaria.objects.filter(is_leaf=True).count()}")
    print(f"  Documentos:     {DocumentoAdicional.objects.count()}")
    print(f"  Preferencias:   {PreferenciaArancelaria.objects.count()}")
    print(f"{'='*55}")
    print("✅ Carga completada.")


if __name__ == '__main__':
    main()
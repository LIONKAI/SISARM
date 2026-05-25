import unicodedata
from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Count
from .models import ArancelBusquedaCompleta, NomenclaturaArancelaria


def quitar_acentos(texto):
    """Normaliza texto quitando tildes para búsqueda flexible."""
    return ''.join(
        c for c in unicodedata.normalize('NFD', texto)
        if unicodedata.category(c) != 'Mn'
    ).lower()


def limpiar_descripcion(desc):
    """Quita guiones y espacios del inicio de la descripción."""
    if not desc:
        return ''
    texto = desc.strip()
    while texto.startswith('-'):
        texto = texto.lstrip('-').strip()
    return texto


@api_view(['POST'])
@permission_classes([AllowAny])
def registrar_usuario(request):
    username = request.data.get('username')
    password = request.data.get('password')
    email = request.data.get('email')

    if not username or not password:
        return Response(
            {'error': 'El usuario y contraseña son obligatorios'},
            status=status.HTTP_400_BAD_REQUEST
        )
    if User.objects.filter(username=username).exists():
        return Response(
            {'error': 'Este nombre de usuario ya está registrado'},
            status=status.HTTP_400_BAD_REQUEST
        )
    User.objects.create_user(username=username, password=password, email=email)
    return Response({'message': 'Usuario registrado exitosamente'}, status=status.HTTP_201_CREATED)


# ── Buscador principal (tabla plana) ──────────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def buscar_arancel(request):
    query = request.query_params.get('q', '').strip()

    if not query:
        return Response(
            {'error': 'Debes proporcionar un término de búsqueda con el parámetro ?q='},
            status=status.HTTP_400_BAD_REQUEST
        )

    if query.replace('.', '').isdigit():
        codigo_limpio = query.replace('.', '')
        resultados = ArancelBusquedaCompleta.objects.filter(
            codigo_nacional__startswith=codigo_limpio
        ).order_by('codigo_nacional')[:20]
    else:
        resultados = ArancelBusquedaCompleta.objects.filter(
            descripcion_mercancia__icontains=query
        ).order_by('codigo_nacional')[:20]

    data = [{
        'codigo_nacional': r.codigo_nacional,
        'codigo_nandina': r.codigo_nandina,
        'descripcion_mercancia': r.descripcion_mercancia,
        'ga_porcentaje': str(r.ga_porcentaje),
        'ice_porcentaje': str(r.ice_porcentaje) if r.ice_porcentaje else None,
        'unidad_medida': r.unidad_medida,
        'documento_adicional': r.documento_adicional,
        'preferencia_arancelaria_ace': r.preferencia_arancelaria_ace,
    } for r in resultados]

    return Response({'resultados': data, 'total': len(data)}, status=status.HTTP_200_OK)


# ── Buscador mejorado (árbol NomenclaturaArancelaria) ─────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def buscar_nomenclatura(request):
    query = request.query_params.get('q', '').strip()

    if not query:
        return Response(
            {'error': 'Proporciona un término con ?q='},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Búsqueda por código numérico
    if query.replace('.', '').isdigit():
        candidatos = NomenclaturaArancelaria.objects.filter(
            is_leaf=True,
            codigo_oficial__startswith=query
        ).order_by('orden')[:20]

    else:
        # Traer todos los nodos hoja y filtrar en Python sin acentos
        query_normalizado = quitar_acentos(query)
        todos = NomenclaturaArancelaria.objects.filter(
            is_leaf=True
        ).order_by('orden')

        candidatos = [
            r for r in todos
            if query_normalizado in quitar_acentos(r.descripcion or '')
        ][:20]

    data = []
    for r in candidatos:
        # Limpiar guiones de la descripción
        desc_limpia = limpiar_descripcion(r.descripcion)

        # Construir ruta jerárquica: 01 › 01.01 › 0101.29
        ruta = []
        nodo = r.parent
        while nodo:
            if nodo.codigo_oficial:
                ruta.insert(0, nodo.codigo_oficial)
            nodo = nodo.parent

        data.append({
            'id': r.id,
            'codigo_oficial': r.codigo_oficial,
            'descripcion': desc_limpia,
            'ruta': ' › '.join(ruta),
            'ga_porcentaje': str(r.ga_porcentaje) if r.ga_porcentaje else '0',
            'ice_porcentaje': str(r.ice_porcentaje) if r.ice_porcentaje else None,
            'unidad_medida': r.unidad_medida,
            'doc_adicional': r.doc_adicional,
            'preferencias': r.preferencias,
        })

    return Response({'resultados': data, 'total': len(data)}, status=status.HTTP_200_OK)


# ── Explorador jerárquico ─────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def explorador_capitulos(request):
    capitulos = (
        ArancelBusquedaCompleta.objects
        .values('codigo_capitulo', 'descripcion_capitulo')
        .annotate(total=Count('codigo_nacional'))
        .order_by('codigo_capitulo')
    )
    data = [{
        'codigo_capitulo': c['codigo_capitulo'],
        'descripcion': c['descripcion_capitulo'] or f"Capítulo {c['codigo_capitulo']}",
        'total_partidas': c['total'],
    } for c in capitulos]
    return Response({'capitulos': data}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def explorador_partidas(request, capitulo):
    partidas = (
        ArancelBusquedaCompleta.objects
        .filter(codigo_capitulo=capitulo)
        .values('codigo_partida')
        .annotate(total=Count('codigo_nacional'))
        .order_by('codigo_partida')
    )
    data = []
    for p in partidas:
        primer_registro = ArancelBusquedaCompleta.objects.filter(
            codigo_partida=p['codigo_partida']
        ).first()
        desc = primer_registro.descripcion_mercancia.lstrip('- ') if primer_registro else ''
        data.append({
            'codigo_partida': p['codigo_partida'],
            'descripcion': desc,
            'total_subpartidas': p['total'],
        })
    return Response({'capitulo': capitulo, 'partidas': data}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def explorador_subpartidas(request, partida):
    registros = ArancelBusquedaCompleta.objects.filter(
        codigo_partida=partida
    ).order_by('codigo_nacional')

    data = [{
        'codigo_nacional': r.codigo_nacional,
        'codigo_nandina': r.codigo_nandina,
        'descripcion_mercancia': r.descripcion_mercancia,
        'ga_porcentaje': str(r.ga_porcentaje),
        'ice_porcentaje': str(r.ice_porcentaje) if r.ice_porcentaje else None,
        'unidad_medida': r.unidad_medida,
        'documento_adicional': r.documento_adicional,
        'preferencia_arancelaria_ace': r.preferencia_arancelaria_ace,
    } for r in registros]

    return Response({'partida': partida, 'subpartidas': data}, status=status.HTTP_200_OK)
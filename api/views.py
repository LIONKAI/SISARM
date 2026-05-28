import unicodedata
from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Count
from django.db import models
from .models import (
    Capitulo, NomenclaturaArancelaria,
    DocumentoAdicional, PreferenciaArancelaria,
    HistorialConsulta, Favorito, PasswordResetToken
)


def quitar_acentos(texto):
    return ''.join(
        c for c in unicodedata.normalize('NFD', texto)
        if unicodedata.category(c) != 'Mn'
    ).lower()


def limpiar_descripcion(desc):
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


# ── Buscador principal ────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def buscar_nomenclatura(request):
    query = request.query_params.get('q', '').strip()

    if not query:
        return Response(
            {'error': 'Proporciona un término con ?q='},
            status=status.HTTP_400_BAD_REQUEST
        )

    if query.replace('.', '').isdigit():
        resultados = NomenclaturaArancelaria.objects.filter(
            is_leaf=True,
            codigo_oficial__startswith=query
        ).select_related('capitulo').order_by('orden')[:20]
    else:
        query_norm = quitar_acentos(query)
        todos = NomenclaturaArancelaria.objects.filter(
            is_leaf=True
        ).select_related('capitulo').order_by('orden')
        resultados = [
            r for r in todos
            if query_norm in quitar_acentos(r.descripcion or '')
        ][:20]

    data = []
    for r in resultados:
        docs = list(r.documentos_adicionales.values(
            'tipo_doc', 'entidad_emisora', 'disposicion_legal'
        ))
        prefs = list(r.preferencias.values(
            'tipo_acuerdo', 'porcentaje_desgravacion'
        ))
        ruta = []
        nodo = r.parent
        while nodo:
            if nodo.codigo_oficial:
                ruta.insert(0, nodo.codigo_oficial)
            nodo = nodo.parent

        data.append({
            'id': r.id,
            'codigo_oficial': r.codigo_oficial,
            'descripcion': limpiar_descripcion(r.descripcion),
            'ruta': ' › '.join(ruta),
            'capitulo': r.capitulo.codigo if r.capitulo else None,
            'ga_porcentaje': str(r.ga_porcentaje) if r.ga_porcentaje is not None else '0',
            'ice_iehd': r.ice_iehd,
            'unidad_medida': r.unidad_medida,
            'despacho_frontera': r.despacho_frontera,
            'documentos_adicionales': docs,
            'preferencias': prefs,
        })

    return Response({'resultados': data, 'total': len(data)}, status=status.HTTP_200_OK)


# ── Explorador jerárquico ─────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def explorador_capitulos(request):
    capitulos = Capitulo.objects.annotate(
        total=Count('nomenclaturas', filter=models.Q(nomenclaturas__is_leaf=True))
    ).order_by('codigo')
    data = [{
        'codigo_capitulo': c.codigo,
        'descripcion': c.descripcion,
        'total_partidas': c.total,
    } for c in capitulos]
    return Response({'capitulos': data}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def explorador_partidas(request, capitulo):
    partidas = NomenclaturaArancelaria.objects.filter(
        capitulo__codigo=capitulo,
        nivel='PARTIDA'
    ).order_by('orden')
    data = [{
        'codigo_partida': p.codigo_oficial,
        'descripcion': limpiar_descripcion(p.descripcion),
        'total_subpartidas': p.hijos.filter(is_leaf=True).count() +
                             sum(h.hijos.filter(is_leaf=True).count() for h in p.hijos.all()),
    } for p in partidas]
    return Response({'capitulo': capitulo, 'partidas': data}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def explorador_subpartidas(request, partida):
    try:
        nodo_partida = NomenclaturaArancelaria.objects.get(
            codigo_oficial=partida, nivel='PARTIDA'
        )
    except NomenclaturaArancelaria.DoesNotExist:
        return Response({'error': 'Partida no encontrada'}, status=status.HTTP_404_NOT_FOUND)

    def obtener_hojas(nodo):
        hojas = []
        for hijo in nodo.hijos.order_by('orden'):
            if hijo.is_leaf:
                hojas.append(hijo)
            else:
                hojas.extend(obtener_hojas(hijo))
        return hojas

    subpartidas = obtener_hojas(nodo_partida)

    data = [{
        'codigo_nacional': s.codigo_oficial,
        'codigo_nandina': s.codigo_oficial[:8] if s.codigo_oficial else None,
        'descripcion_mercancia': limpiar_descripcion(s.descripcion),
        'ga_porcentaje': str(s.ga_porcentaje) if s.ga_porcentaje is not None else '0',
        'ice_iehd': s.ice_iehd,
        'unidad_medida': s.unidad_medida,
        'despacho_frontera': s.despacho_frontera,
        'documento_adicional': ', '.join([
            d.tipo_doc for d in s.documentos_adicionales.all()
        ]) or None,
        'preferencia_arancelaria_ace': ', '.join([
            f"{p.tipo_acuerdo}:{p.porcentaje_desgravacion}%"
            for p in s.preferencias.all()
        ]) or None,
    } for s in subpartidas]

    return Response({'partida': partida, 'subpartidas': data}, status=status.HTTP_200_OK)
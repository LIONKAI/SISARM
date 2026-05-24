from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

@api_view(['POST'])
@permission_classes([AllowAny]) 
def registrar_usuario(request):
    username = request.data.get('username')
    email = request.data.get('email')
    password = request.data.get('password')

    if not username or not password or not email:
        return Response({'error': 'Todos los campos son obligatorios.'}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=username).exists():
        return Response({'error': 'El nombre de usuario ya está en uso.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.create_user(username=username, email=email, password=password)
        return Response({'mensaje': 'Usuario registrado con éxito.'}, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({'error': 'Hubo un error al crear la cuenta.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    from django.contrib.postgres.search import SearchVector, SearchQuery
from django.contrib.postgres.search import SearchQuery # <-- Esta línea resuelve el error de Pylance
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import ArancelBusquedaCompleta

@api_view(['GET'])
@permission_classes([AllowAny])
def buscar_arancel(request):
    # Capturamos lo que el usuario escribió en la barra de búsqueda de React
    termino_usuario = request.query_params.get('q', '').strip()

    if not termino_usuario:
        return Response([]) # Si está vacío, devolvemos una lista vacía

    # 1. Si digita solo números, busca coincidencias por código nacional
    if termino_usuario.isdigit():
        resultados = ArancelBusquedaCompleta.objects.filter(
            codigo_nacional__startswith=termino_usuario
        )[:50] # Limitamos a 50 resultados por rendimiento
    
    # 2. Si digita texto (aspectos, nombres, leyes), busca por Inteligencia de Texto Completo
    else:
        query = SearchQuery(termino_usuario)
        resultados = ArancelBusquedaCompleta.objects.filter(
            search_vector=query
        )[:50]

    # Convertimos los resultados de la base de datos a formato JSON
    datos_json = []
    for item in resultados:
        datos_json.append({
            'codigo_nacional': item.codigo_nacional,
            'descripcion_mercancia': item.descripcion_mercancia,
            'ga_porcentaje': float(item.ga_porcentaje),
            'ice_porcentaje': float(item.ice_porcentaje) if item.ice_porcentaje else 0,
            'unidad_medida': item.unidad_medida,
            'documento_adicional': item.documento_adicional,
            'preferencia_arancelaria_ace': item.preferencia_arancelaria_ace,
        })

    return Response(datos_json)
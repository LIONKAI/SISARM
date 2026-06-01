import unicodedata
from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Count
from django.db import models
import re  #
import secrets
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from .models import PasswordResetToken
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

RE_USERNAME = re.compile(r'^[A-Za-z0-9_.-]+$')
def validar_username(valor):
    if not valor:
        return 'El nombre de usuario es obligatorio.'
    if re.search(r'\s', valor):
        return 'No se permiten espacios en blanco.'
    if len(valor) < 3:
        return 'El nombre de usuario debe tener mínimo 3 caracteres.'
    if len(valor) > 20:
        return 'El nombre de usuario debe tener máximo 20 caracteres.'
    if not RE_USERNAME.match(valor):
        return ('El nombre de usuario sólo admite letras, números, '
'guion bajo, punto y guion.')
    return None

@api_view(['POST'])
@permission_classes([AllowAny])
def registrar_usuario(request):
    username = (request.data.get('username') or '').strip()
    password = (request.data.get('password') or '').strip()
    email = (request.data.get('email') or '').strip()

# Validación de formato del username — defensa en profundidad (HU 1.1 v2).
    error_username = validar_username(username)
    if error_username:
        return Response({'error': error_username},
                        status=status.HTTP_400_BAD_REQUEST)

    if not password:
        return Response({'error': 'La contraseña es obligatoria.'},
                        status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=username).exists():
        return Response({'error': 'Este nombre de usuario ya está registrado.'},
                        status=status.HTTP_400_BAD_REQUEST)

    User.objects.create_user(username=username, password=password, email=email)
    return Response({'message': 'Usuario registrado exitosamente.'},
                    status=status.HTTP_201_CREATED)


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
# ══════════════════════════════════════════════════════════════════════
#  HU 1.2 — RECUPERACIÓN DE CONTRASEÑA
#  Dos endpoints: solicitar enlace y restablecer con token.
# ══════════════════════════════════════════════════════════════════════

@api_view(['POST'])
@permission_classes([AllowAny])
def solicitar_recuperacion(request):
    """
    Recibe un email. Si existe un usuario con ese email, genera un token
    de recuperación válido por 60 minutos y envía un enlace por correo.

    Por seguridad responde siempre lo mismo (criterio 1.1.3 — evitar
    enumeración de cuentas), independientemente de si el email existe.
    """
    email = (request.data.get('email') or '').strip().lower()

    # Validación básica de formato — la principal vive en frontend.
    if not email or '@' not in email:
        return Response({'error': 'Debe proporcionar un correo electrónico válido.'},
                        status=status.HTTP_400_BAD_REQUEST)

    # Mensaje genérico que devolveremos pase lo que pase.
    respuesta_generica = {
        'message': 'Si el correo está registrado, recibirá un enlace de recuperación en breve.'
    }

    try:
        usuario = User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        return Response(respuesta_generica, status=status.HTTP_200_OK)

    # Generar token criptográficamente seguro (RFC 4648 base64-url).
    token = secrets.token_urlsafe(48)
    expira_en = timezone.now() + timedelta(minutes=60)

    # Invalidar tokens anteriores no usados para no acumular enlaces vivos.
    PasswordResetToken.objects.filter(usuario=usuario, usado=False).update(usado=True)

    PasswordResetToken.objects.create(
        usuario=usuario,
        token=token,
        expira_en=expira_en,
    )

    # Construir el enlace que viajará en el correo.
    enlace = f"{settings.FRONTEND_URL}/restablecer/?token={token}"

    asunto = 'SISARM — Recuperación de contraseña'
    mensaje_texto = (
        f"Hola {usuario.username},\n\n"
        f"Recibimos una solicitud para restablecer su contraseña de SISARM.\n\n"
        f"Para definir una contraseña nueva, abra el siguiente enlace:\n\n"
        f"{enlace}\n\n"
        f"El enlace estará activo durante 60 minutos y sólo puede usarse una vez.\n\n"
        f"Si usted no solicitó este cambio, ignore este correo. Su contraseña "
        f"actual seguirá siendo válida.\n\n"
        f"— Equipo SISARM"
    )

    try:
        send_mail(
        subject=asunto,
        message=mensaje_texto,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[email],
        fail_silently=False,
    )
    except Exception as e:
        print(f"[ERROR envío email recuperación] {e}")

    return Response(respuesta_generica, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([AllowAny])
def restablecer_password(request):
    """
    Recibe token y nueva contraseña. Si el token es válido (existe, no
    está usado y no ha expirado), actualiza la contraseña del usuario
    asociado y marca el token como usado.
    """
    token = (request.data.get('token') or '').strip()
    nueva_password = request.data.get('password') or ''

    if not token:
        return Response({'error': 'Token no proporcionado.'},
                        status=status.HTTP_400_BAD_REQUEST)

    # Validación de formato de la nueva contraseña (criterio 1.2.3).
    if len(nueva_password) < 8:
        return Response({'error': 'La contraseña debe tener mínimo 8 caracteres.'},
                        status=status.HTTP_400_BAD_REQUEST)
    if not any(c.isalpha() for c in nueva_password):
        return Response({'error': 'La contraseña debe incluir al menos una letra.'},
                        status=status.HTTP_400_BAD_REQUEST)
    if not any(c.isdigit() for c in nueva_password):
        return Response({'error': 'La contraseña debe incluir al menos un número.'},
                        status=status.HTTP_400_BAD_REQUEST)
    if all(c.isalnum() for c in nueva_password):
        return Response({'error': 'La contraseña debe incluir al menos un símbolo.'},
                        status=status.HTTP_400_BAD_REQUEST)

    try:
        registro = PasswordResetToken.objects.get(token=token)
    except PasswordResetToken.DoesNotExist:
        return Response({'error': 'El enlace de recuperación no es válido.'},
                        status=status.HTTP_400_BAD_REQUEST)

    if not registro.es_valido():
        return Response({'error': 'El enlace de recuperación ha expirado o ya fue utilizado.'},
                        status=status.HTTP_400_BAD_REQUEST)

    # Cambiar contraseña y consumir el token.
    usuario = registro.usuario
    usuario.set_password(nueva_password)
    usuario.save()

    registro.usado = True
    registro.save()

    return Response({'message': 'Contraseña actualizada correctamente. Ya puede ingresar al sistema con su nueva contraseña.'},
                    status=status.HTTP_200_OK)
    

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
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from datetime import datetime, timedelta
from .models import (
    Capitulo, NomenclaturaArancelaria,
    DocumentoAdicional, PreferenciaArancelaria,
    HistorialConsulta, Favorito, PasswordResetToken
)
from .security import rate_limit  # HU 6.4 — rate limiting


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
@rate_limit(max_requests=10, ventana_seg=600, scope='registro')
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
            'capitulo_descripcion': r.capitulo.descripcion if r.capitulo else None, 
            'capitulo_notas_legales': r.capitulo.notas_legales if r.capitulo else None,
            'notas_explicativas': r.notas_explicativas,                                 
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
@rate_limit(max_requests=5, ventana_seg=600, scope='recuperar')
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
    
# ══════════════════════════════════════════════════════════════════════
# FAVORITOS — Historia 5.2 (SIS-23)
# ══════════════════════════════════════════════════════════════════════

LIMITE_FAVORITOS = 50  # Criterio 5.2.1 (Sellen & Whittaker, 2010)


def _serializar_favorito(fav):
    """Arma el dict que enviamos al frontend, con los datos clave de la partida."""
    n = fav.nomenclatura
    return {
        'id': fav.id,
        'nomenclatura_id': n.id,
        'codigo_oficial': n.codigo_oficial,
        'descripcion': limpiar_descripcion(n.descripcion),
        'capitulo': n.capitulo.codigo if n.capitulo else None,
        'ga_porcentaje': str(n.ga_porcentaje) if n.ga_porcentaje is not None else '0',
        'ice_iehd': n.ice_iehd,
        'unidad_medida': n.unidad_medida,
        'notas_personales': fav.notas_personales or '',
        'creado_en': fav.creado_en.isoformat(),
    }


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def favoritos(request):
    # ── Listar los favoritos del usuario autenticado ──
    if request.method == 'GET':
        favs = Favorito.objects.filter(
            usuario=request.user
        ).select_related('nomenclatura', 'nomenclatura__capitulo')
        data = [_serializar_favorito(f) for f in favs]
        return Response({
            'favoritos': data,
            'total': len(data),
            'limite': LIMITE_FAVORITOS,
        }, status=status.HTTP_200_OK)

    # ── Agregar un favorito ──
    nomenclatura_id = request.data.get('nomenclatura_id')
    notas = request.data.get('notas_personales', '')

    if not nomenclatura_id:
        return Response(
            {'error': 'Debes indicar la partida a guardar (nomenclatura_id)'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # La partida debe existir y ser nodo hoja (subpartida nacional operativa)
    try:
        nomenclatura = NomenclaturaArancelaria.objects.get(id=nomenclatura_id, is_leaf=True)
    except NomenclaturaArancelaria.DoesNotExist:
        return Response(
            {'error': 'La partida indicada no existe o no es una subpartida nacional'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Criterio 5.2.1 — tope de 50 favoritos por usuario
    if Favorito.objects.filter(usuario=request.user).count() >= LIMITE_FAVORITOS:
        return Response(
            {'error': f'Alcanzaste el límite de {LIMITE_FAVORITOS} favoritos. '
                      f'Elimina alguno antes de guardar otro.'},
            status=status.HTTP_409_CONFLICT
        )

    # Evitar duplicados (el unique_together lo refuerza a nivel de BD)
    if Favorito.objects.filter(usuario=request.user, nomenclatura=nomenclatura).exists():
        return Response(
            {'error': 'Esta partida ya está en tus favoritos'},
            status=status.HTTP_409_CONFLICT
        )

    fav = Favorito.objects.create(
        usuario=request.user,
        nomenclatura=nomenclatura,
        notas_personales=notas,
    )
    return Response(_serializar_favorito(fav), status=status.HTTP_201_CREATED)


@api_view(['DELETE', 'PATCH'])
@permission_classes([IsAuthenticated])
def favorito_detalle(request, favorito_id):
    # Privacidad (criterio 5.2.2): filtramos SIEMPRE por request.user.
    # Así nadie puede borrar ni editar un favorito ajeno aunque conozca su id.
    try:
        fav = Favorito.objects.get(id=favorito_id, usuario=request.user)
    except Favorito.DoesNotExist:
        return Response({'error': 'Favorito no encontrado'},
                        status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        fav.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # PATCH — actualizar la nota personal
    fav.notas_personales = request.data.get('notas_personales', fav.notas_personales)
    fav.save(update_fields=['notas_personales'])
    return Response(_serializar_favorito(fav), status=status.HTTP_200_OK)
# ══════════════════════════════════════════════════════════════════════
# EXPORTAR PDF DE CLASIFICACIÓN — Historia 5.1 (SIS-22)
# Genera un reporte profesional con encabezado, identificación del
# despachante, contenido íntegro de la partida y firma del sistema.
# Librería: ReportLab (pura Python, sin dependencias del sistema).
# ══════════════════════════════════════════════════════════════════════
from django.http import HttpResponse
from io import BytesIO
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib.colors import HexColor, black, white, grey
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.enums import TA_CENTER

NOMBRES_ACUERDO_PDF = {
    'CAN': 'Comunidad Andina (CAN)',
    'ACE_36': 'ACE 36 — Mercosur',
    'ACE_47': 'ACE 47',
    'VEN': 'Venezuela',
    'ACE_22_CHI': 'ACE 22 — Chile',
    'ACE_22_PROT': 'ACE 22 — Protocolo',
    'ACE_66_MEX': 'ACE 66 — México',
}


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def exportar_pdf_clasificacion(request, nomenclatura_id):
    # ── Datos de la partida ──
    try:
        n = (NomenclaturaArancelaria.objects
             .select_related('capitulo')
             .prefetch_related('documentos_adicionales', 'preferencias')
             .get(id=nomenclatura_id, is_leaf=True))
    except NomenclaturaArancelaria.DoesNotExist:
        return Response({'error': 'Partida no encontrada'},
                        status=status.HTTP_404_NOT_FOUND)

    ahora = datetime.now()
    id_reporte = f"SISARM-{ahora.strftime('%Y%m%d%H%M%S')}-{n.codigo_oficial.replace('.', '')}"

    # ── Documento ──
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm,
        # Criterio 5.1.3 — metadatos ISO 32000-1
        title=f"Clasificación Arancelaria {n.codigo_oficial}",
        author=f"SISARM - {request.user.username}",
        subject="Reporte de Clasificación Arancelaria",
    )

    estilos = getSampleStyleSheet()
    h1 = ParagraphStyle('h1', parent=estilos['Heading1'], fontSize=20,
                        textColor=HexColor('#1e3a8a'), spaceAfter=4)
    h2 = ParagraphStyle('h2', parent=estilos['Heading2'], fontSize=12,
                        textColor=HexColor('#1e3a8a'), spaceAfter=8)
    normal = ParagraphStyle('normal', parent=estilos['Normal'], fontSize=10, leading=14)
    pequeno = ParagraphStyle('peq', parent=estilos['Normal'], fontSize=8,
                              textColor=grey, leading=11, alignment=TA_CENTER)

    el = []

    # ── Encabezado ──
    el.append(Paragraph('<b>SISARM</b>', h1))
    el.append(Paragraph('Sistema de Clasificación Arancelaria y Gestión de Mercancías', normal))
    el.append(Spacer(1, 4))
    el.append(Paragraph('<b>Reporte de Clasificación Arancelaria</b>',
                        ParagraphStyle('subtit', parent=normal, fontSize=14,
                                       textColor=HexColor('#374151'), spaceAfter=12)))

    # ── Identificación (criterio 5.1.2) ──
    tabla_ident = Table([
        ['Despachante:', request.user.username, 'Fecha:', ahora.strftime('%d/%m/%Y')],
        ['ID de reporte:', id_reporte, 'Hora:', ahora.strftime('%H:%M:%S')],
    ], colWidths=[2.8*cm, 6*cm, 1.5*cm, 4*cm])
    tabla_ident.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), HexColor('#f9fafb')),
        ('TEXTCOLOR', (0, 0), (0, -1), HexColor('#6b7280')),
        ('TEXTCOLOR', (2, 0), (2, -1), HexColor('#6b7280')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOX', (0, 0), (-1, -1), 0.5, HexColor('#e5e7eb')),
        ('INNERGRID', (0, 0), (-1, -1), 0.25, HexColor('#e5e7eb')),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    el.append(tabla_ident)
    el.append(Spacer(1, 16))

    # ── 1. Datos generales ──
    el.append(Paragraph('1. Datos generales de la mercancía', h2))
    descripcion = (n.descripcion or '').lstrip(' -').strip()
    cap_texto = f"{n.capitulo.codigo} — {n.capitulo.descripcion}" if n.capitulo else '—'
    t1 = Table([
        ['Código arancelario', n.codigo_oficial],
        ['Descripción', Paragraph(descripcion, normal)],
        ['Capítulo', Paragraph(cap_texto, normal)],
        ['Unidad de medida', n.unidad_medida or '—'],
    ], colWidths=[5*cm, 11*cm])
    t1.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), HexColor('#eff6ff')),
        ('TEXTCOLOR', (0, 0), (0, -1), HexColor('#1e3a8a')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOX', (0, 0), (-1, -1), 0.5, HexColor('#bfdbfe')),
        ('INNERGRID', (0, 0), (-1, -1), 0.25, HexColor('#dbeafe')),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    el.append(t1)
    el.append(Spacer(1, 14))

    # ── 2. Tributos ──
    el.append(Paragraph('2. Tributos aplicables', h2))
    ga = f"{n.ga_porcentaje}%".replace('.', ',') if n.ga_porcentaje is not None else '—'
    t2 = Table([
        ['Concepto', 'Valor'],
        ['Gravamen Arancelario (GA)', ga],
        ['ICE / IEHD', n.ice_iehd or 'No aplica'],
        ['IVA importación', '14,94% (sobre base CIF + GA)'],
        ['Despacho en frontera', n.despacho_frontera or '—'],
    ], colWidths=[8*cm, 8*cm])
    t2.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HexColor('#3b82f6')),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ALIGN', (1, 0), (1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOX', (0, 0), (-1, -1), 0.5, HexColor('#3b82f6')),
        ('INNERGRID', (0, 0), (-1, -1), 0.25, HexColor('#bfdbfe')),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    el.append(t2)
    el.append(Spacer(1, 14))

    # ── 3. Documentos adicionales ──
    el.append(Paragraph('3. Documentación adicional requerida', h2))
    docs = list(n.documentos_adicionales.all())
    if docs:
        filas = [['Tipo', 'Entidad emisora', 'Disposición legal']]
        for d in docs:
            filas.append([
                d.tipo_doc or '',
                Paragraph(d.entidad_emisora or '', normal),
                Paragraph(d.disposicion_legal or '—', normal),
            ])
        t3 = Table(filas, colWidths=[3*cm, 7*cm, 6*cm])
        t3.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#dc2626')),
            ('TEXTCOLOR', (0, 0), (-1, 0), white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOX', (0, 0), (-1, -1), 0.5, HexColor('#dc2626')),
            ('INNERGRID', (0, 0), (-1, -1), 0.25, HexColor('#fecaca')),
            ('BACKGROUND', (0, 1), (-1, -1), HexColor('#fef2f2')),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        el.append(t3)
    else:
        el.append(Paragraph('Esta mercancía no requiere documentación adicional.', normal))
    el.append(Spacer(1, 14))

    # ── 4. Preferencias arancelarias ──
    el.append(Paragraph('4. Preferencias arancelarias por acuerdo comercial', h2))
    prefs = list(n.preferencias.all())
    if prefs:
        filas = [['Acuerdo comercial', '% de desgravación', 'Estado']]
        for p in prefs:
            d = float(p.porcentaje_desgravacion)
            estado = 'Liberado' if d >= 100 else ('Parcial' if d > 0 else 'Sin preferencia')
            d_fmt = f"{d:.2f}".replace('.', ',') + '%'
            filas.append([
                NOMBRES_ACUERDO_PDF.get(p.tipo_acuerdo, p.tipo_acuerdo), d_fmt, estado
            ])
        t4 = Table(filas, colWidths=[8*cm, 4*cm, 4*cm])
        t4.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#16a34a')),
            ('TEXTCOLOR', (0, 0), (-1, 0), white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOX', (0, 0), (-1, -1), 0.5, HexColor('#16a34a')),
            ('INNERGRID', (0, 0), (-1, -1), 0.25, HexColor('#bbf7d0')),
            ('BACKGROUND', (0, 1), (-1, -1), HexColor('#f0fdf4')),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        el.append(t4)
    else:
        el.append(Paragraph('Sin preferencias arancelarias registradas.', normal))

    el.append(Spacer(1, 24))

    # ── Pie / firma del sistema (criterio 5.1.2) ──
    el.append(Paragraph(f"Documento generado por <b>SISARM</b> · ID: {id_reporte}", pequeno))
    el.append(Paragraph(
        f"Reporte oficial emitido el {ahora.strftime('%d/%m/%Y a las %H:%M:%S')} (UTC-4 Bolivia).",
        pequeno))

    doc.build(el)

    # ── Respuesta ──
    buffer.seek(0)
    response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
    response['Content-Disposition'] = (
        f'attachment; filename="SISARM_{n.codigo_oficial}_{ahora.strftime("%Y%m%d_%H%M%S")}.pdf"'
    )
    # Registro en historial (HU 5.3 / SIS-24)
    registrar_historial(
        request, tipo='EXPLORACION',
        query=f"Exportación PDF: {n.codigo_oficial}",
        resultado_codigo=n.codigo_oficial,
        metadata={'action': 'exportar_pdf'},
    )
    return response
    # ══════════════════════════════════════════════════════════════════════
# HISTORIAL DE CONSULTAS — Historia 5.3 (SIS-24)
# Auditoría profesional según Ley 1990 Art. 38.
# ══════════════════════════════════════════════════════════════════════

def registrar_historial(request, tipo, query, resultado_codigo=None, metadata=None):
    """
    Registra una consulta en el historial del usuario autenticado.
    Falla silenciosamente: la auditoría nunca debe romper la respuesta al usuario.
    Si el usuario es anónimo, no se registra nada (criterio 5.3.2).
    """
    if not request.user.is_authenticated:
        return
    try:
        HistorialConsulta.objects.create(
            usuario=request.user,
            tipo=tipo,
            query=(query or '')[:1000],   # protección contra queries enormes
            resultado_codigo=resultado_codigo,
            metadata=metadata or {},
        )
    except Exception:
        pass  # auditoría no bloquea la operación principal


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def historial_consultas(request):
    """
    Lista el historial del usuario autenticado con filtros opcionales.
    Solo expone GET — inmutabilidad por diseño de API (criterio 5.3.1).
    Filtros: ?q=texto & desde=YYYY-MM-DD & hasta=YYYY-MM-DD & tipo=BUSQUEDA
    """
    qs = HistorialConsulta.objects.filter(usuario=request.user)

    # Palabra clave (en query o en el código resultante)
    q = (request.query_params.get('q') or '').strip()
    if q:
        qs = qs.filter(Q(query__icontains=q) | Q(resultado_codigo__icontains=q))

    # Rango de fechas
    desde = request.query_params.get('desde')
    hasta = request.query_params.get('hasta')
    if desde:
        try:
            d = datetime.strptime(desde, '%Y-%m-%d')
            qs = qs.filter(timestamp__gte=d)
        except ValueError:
            pass
    if hasta:
        try:
            h = datetime.strptime(hasta, '%Y-%m-%d') + timedelta(days=1)
            qs = qs.filter(timestamp__lt=h)
        except ValueError:
            pass

    # Tipo de consulta
    tipo = request.query_params.get('tipo')
    if tipo:
        qs = qs.filter(tipo=tipo)

    LIMITE = 500
    total = qs.count()
    items = qs[:LIMITE]

    data = [{
        'id': h.id,
        'tipo': h.tipo,
        'tipo_display': h.get_tipo_display(),
        'query': h.query,
        'resultado_codigo': h.resultado_codigo,
        'metadata': h.metadata,
        'timestamp': h.timestamp.isoformat(),
    } for h in items]
    

    return Response({
        'historial': data,
        'total_filtrado': total,
        'mostrando': len(data),
        'limite': LIMITE,
    }, status=status.HTTP_200_OK)
    
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def registrar_consulta_partida(request):
    """
    Registra una consulta deliberada: el despachante abrió la ficha de una
    partida específica. Esto genera entradas significativas en el historial,
    en lugar de capturar tecleo parcial (HU 5.3 / SIS-24).
    """
    nomenclatura_id = request.data.get('nomenclatura_id')
    query_origen = (request.data.get('query_origen') or '').strip()

    if not nomenclatura_id:
        return Response({'error': 'Falta nomenclatura_id'},
                        status=status.HTTP_400_BAD_REQUEST)

    try:
        n = NomenclaturaArancelaria.objects.get(id=nomenclatura_id, is_leaf=True)
    except NomenclaturaArancelaria.DoesNotExist:
        return Response({'error': 'Partida no encontrada'},
                        status=status.HTTP_404_NOT_FOUND)

    registrar_historial(
        request, tipo='BUSQUEDA',
        query=query_origen or f"Consulta directa: {n.codigo_oficial}",
        resultado_codigo=n.codigo_oficial,
        metadata={'descripcion': limpiar_descripcion(n.descripcion)[:200]},
    )
    return Response({'ok': True}, status=status.HTTP_201_CREATED)


# ══════════════════════════════════════════════════════════════════════
#  ASISTENTE IA — SIS-26: Clasificar por lenguaje natural
# ══════════════════════════════════════════════════════════════════════

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def clasificar_lenguaje_natural(request):
    """
    HU SIS-26 — Clasificar una mercancía descrita en lenguaje natural
    usando IA (Google Gemini).

    Flujo:
      1. Validar la descripción del usuario.
      2. Pre-filtrar candidatos con búsqueda textual (mejora la precisión
         del LLM y reduce tokens).
      3. Pedir a Gemini que elija la mejor partida y justifique.
      4. Enriquecer la sugerencia con datos completos de la BD.
      5. Registrar en el historial (tipo IA_CLASIFIC).
    """
    from .gemini_service import (
        clasificar_descripcion, GeminiNotConfigured, GeminiInvalidResponse,
    )

    descripcion = (request.data.get('descripcion') or '').strip()

    # ── Validaciones de entrada ──
    if not descripcion:
        return Response(
            {'error': 'Debe escribir una descripción de la mercancía.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if len(descripcion) < 5:
        return Response(
            {'error': 'La descripción es demasiado corta (mínimo 5 caracteres).'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if len(descripcion) > 500:
        return Response(
            {'error': 'La descripción es demasiado larga (máximo 500 caracteres).'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── 1. Pre-filtrar candidatos por coincidencia de palabras ──
    desc_norm = quitar_acentos(descripcion)
    palabras_clave = [p for p in desc_norm.split() if len(p) >= 4]

    todas = NomenclaturaArancelaria.objects.filter(
        is_leaf=True
    ).select_related('capitulo')

    candidatos_scored = []
    for nom in todas:
        desc_n = quitar_acentos(nom.descripcion or '')
        score = sum(1 for p in palabras_clave if p in desc_n)
        if score > 0:
            candidatos_scored.append((score, nom))

    candidatos_scored.sort(key=lambda x: -x[0])
    top_candidatos = [n for _, n in candidatos_scored[:15]]

    candidatos_payload = [{
        'codigo_oficial': n.codigo_oficial,
        'descripcion': limpiar_descripcion(n.descripcion)[:200],
        'capitulo_desc': (n.capitulo.descripcion[:80] if n.capitulo else ''),
    } for n in top_candidatos]

    # ── 2. Pedir clasificación a Gemini ──
    try:
        sugerencia = clasificar_descripcion(descripcion, candidatos_payload)
    except GeminiNotConfigured as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    except GeminiInvalidResponse as e:
        return Response(
            {'error': f'La IA devolvió una respuesta inválida. {str(e)}'},
            status=status.HTTP_502_BAD_GATEWAY,
        )
    except Exception as e:
        return Response(
            {'error': f'Error al contactar el servicio de IA: {str(e)[:120]}'},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    # ── 3. Enriquecer con datos completos de la BD ──
    codigo_sugerido = (sugerencia.get('codigo_sugerido') or '').strip()
    detalle_partida = None
    if codigo_sugerido:
        nom = NomenclaturaArancelaria.objects.filter(
            is_leaf=True, codigo_oficial=codigo_sugerido,
        ).select_related('capitulo').first()
        if nom:
            ruta = []
            nodo = nom.parent
            while nodo:
                if nodo.codigo_oficial:
                    ruta.insert(0, nodo.codigo_oficial)
                nodo = nodo.parent
            detalle_partida = {
                'id': nom.id,
                'codigo_oficial': nom.codigo_oficial,
                'descripcion': limpiar_descripcion(nom.descripcion),
                'ruta': ' › '.join(ruta),
                'ga_porcentaje': (
                    str(nom.ga_porcentaje) if nom.ga_porcentaje is not None else '0'
                ),
                'unidad_medida': nom.unidad_medida,
                'capitulo': nom.capitulo.codigo if nom.capitulo else None,
                'capitulo_descripcion': nom.capitulo.descripcion if nom.capitulo else None,
            }

    # ── 4. Registrar en historial (auditoría HU 5.3) ──
    registrar_historial(
        request,
        tipo='IA_CLASIFIC',
        query=descripcion,
        resultado_codigo=codigo_sugerido or None,
        metadata={
            'confianza': sugerencia.get('confianza'),
            'justificacion': (sugerencia.get('justificacion') or '')[:300],
            'alternativas_count': len(sugerencia.get('alternativas', []) or []),
            'candidatos_evaluados': len(candidatos_payload),
        },
    )

    return Response({
        'descripcion_consultada': descripcion,
        'sugerencia': sugerencia,
        'detalle_partida': detalle_partida,
    }, status=status.HTTP_200_OK)


# ══════════════════════════════════════════════════════════════════════
#  ASISTENTE CONVERSACIONAL — consolida SIS-26, SIS-27, SIS-14
# ══════════════════════════════════════════════════════════════════════

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@rate_limit(max_requests=20, ventana_seg=60, scope='chat_ia')
def chat_asistente_ia(request):
    """
    Chat conversacional con acceso a la BD del arancel via function calling.
    Reemplaza la clasificacion natural, el resumen de notas y la comparacion
    de partidas en una sola interfaz conversacional.

    Espera: { "messages": [{"role": "user"|"assistant", "content": "..."}, ...] }
    Devuelve: { "reply": "...", "tools_used": [...] }
    """
    from .chat_assistant import responder_chat, GeminiNotConfigured

    messages = request.data.get('messages')
    if not isinstance(messages, list) or not messages:
        return Response(
            {'error': 'Debe enviar una lista no vacia de mensajes.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if len(messages) > 30:
        # Truncar para evitar prompts gigantes y abuso
        messages = messages[-30:]

    # Validar formato basico
    for m in messages:
        if not isinstance(m, dict):
            return Response({'error': 'Mensaje invalido.'}, status=status.HTTP_400_BAD_REQUEST)
        if m.get('role') not in ('user', 'assistant'):
            return Response({'error': 'Role debe ser "user" o "assistant".'}, status=status.HTTP_400_BAD_REQUEST)
        if not isinstance(m.get('content'), str):
            return Response({'error': 'Content debe ser texto.'}, status=status.HTTP_400_BAD_REQUEST)

    if messages[-1].get('role') != 'user':
        return Response(
            {'error': 'El ultimo mensaje debe ser del usuario.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if len(messages[-1].get('content', '').strip()) < 1:
        return Response(
            {'error': 'El mensaje del usuario no puede estar vacio.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if len(messages[-1].get('content', '')) > 1000:
        return Response(
            {'error': 'El mensaje es demasiado largo (max 1000 caracteres).'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        resultado = responder_chat(messages)
    except GeminiNotConfigured as e:
        return Response({'error': str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except Exception as e:
        return Response(
            {'error': f'Error al contactar el servicio de IA: {str(e)[:140]}'},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    # Registrar en historial (audita la pregunta y herramientas usadas)
    registrar_historial(
        request,
        tipo='IA_CLASIFIC',  # reutilizamos hasta crear un tipo CHAT especifico
        query=messages[-1]['content'][:500],
        resultado_codigo=None,
        metadata={
            'tools_used': resultado.get('tools_used', []),
            'turnos_conversacion': len(messages),
            'longitud_respuesta': len(resultado.get('reply', '')),
        },
    )

    return Response({
        'reply': resultado.get('reply', ''),
        'tools_used': resultado.get('tools_used', []),
    }, status=status.HTTP_200_OK)

from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


# ══════════════════════════════════════════════════════════════════════
# CAPÍTULO — Tabla raíz del arancel
# ══════════════════════════════════════════════════════════════════════

class Capitulo(models.Model):
    """
    Capítulos del Arancel Aduanero (01 a 98 en el SA completo).
    Para este proyecto: 01, 02 y 03.
    """
    codigo = models.CharField(max_length=2, primary_key=True, help_text="Código de 2 dígitos (ej: '01')")
    descripcion = models.TextField(help_text="Nombre oficial del capítulo")
    notas_legales = models.TextField(blank=True, null=True,
                                     help_text="Notas legales del capítulo (críticas para clasificación)")
    seccion = models.CharField(max_length=10, blank=True, null=True,
                               help_text="Sección a la que pertenece (ej: 'I')")

    class Meta:
        ordering = ['codigo']

    def __str__(self):
        return f"Capítulo {self.codigo} - {self.descripcion[:60]}"


# ══════════════════════════════════════════════════════════════════════
# NOMENCLATURA ARANCELARIA — Árbol jerárquico
# ══════════════════════════════════════════════════════════════════════

class NomenclaturaArancelaria(models.Model):
    """
    Árbol jerárquico de la nomenclatura arancelaria.
    Soporta los 5 niveles: PARTIDA, AGRUPACION, SUBPARTIDA_SA, NANDINA, SUBPARTIDA_NACIONAL.
    """
    NIVELES = [
        ('PARTIDA',             'Partida'),
        ('AGRUPACION',          'Agrupación'),
        ('SUBPARTIDA_SA',       'Subpartida SA'),
        ('NANDINA',             'NANDINA'),
        ('SUBPARTIDA_NACIONAL', 'Subpartida Nacional'),
    ]

    # Estructura jerárquica
    capitulo = models.ForeignKey(Capitulo, on_delete=models.CASCADE,
                                  related_name='nomenclaturas',
                                  help_text="Capítulo al que pertenece")
    parent = models.ForeignKey('self', null=True, blank=True,
                                on_delete=models.CASCADE, related_name='hijos',
                                help_text="Nodo padre en el árbol")
    nivel = models.CharField(max_length=25, choices=NIVELES)
    codigo_oficial = models.CharField(max_length=20, null=True, blank=True, db_index=True,
                                       help_text="Código oficial (null para agrupaciones)")
    descripcion = models.TextField()
    orden = models.IntegerField(default=0, help_text="Orden dentro del padre para respetar el arancel")
    is_leaf = models.BooleanField(default=False, db_index=True,
                                   help_text="True si es Subpartida Nacional (nodo operativo)")

    # Campos operativos (solo en nodos hoja, según columnas del arancel oficial)
    ga_porcentaje = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True,
                                         help_text="Gravamen Arancelario en %")
    ice_iehd = models.CharField(max_length=100, blank=True, null=True,
                                 help_text="ICE o IEHD aplicable")
    unidad_medida = models.CharField(max_length=20, blank=True, null=True,
                                      help_text="Unidad de medida (kg, u, L, etc.)")
    despacho_frontera = models.CharField(max_length=100, blank=True, null=True,
                                          help_text="Indicación de despacho en frontera")

    # Campo para Asistente IA (Épica 4)
    notas_explicativas = models.TextField(blank=True, null=True,
                                           help_text="Notas explicativas OMA o resumen IA cacheado")

    class Meta:
        ordering = ['orden']
        indexes = [
            models.Index(fields=['capitulo', 'orden']),
            models.Index(fields=['is_leaf', 'codigo_oficial']),
        ]

    def __str__(self):
        cod = self.codigo_oficial or 'AGR'
        return f"[{self.nivel}] {cod} — {self.descripcion[:40]}"

    @property
    def ruta_jerarquica(self):
        """Devuelve la ruta completa: 01 › 0101 › 0101.21"""
        ruta = []
        nodo = self
        while nodo:
            if nodo.codigo_oficial:
                ruta.insert(0, nodo.codigo_oficial)
            nodo = nodo.parent
        if self.capitulo and not ruta:
            ruta.insert(0, self.capitulo.codigo)
        return ' › '.join(ruta)


# ══════════════════════════════════════════════════════════════════════
# DOCUMENTO ADICIONAL — Para columna "Documento Adicional" del arancel
# ══════════════════════════════════════════════════════════════════════

class DocumentoAdicional(models.Model):
    """
    Documentos adicionales requeridos para el despacho aduanero.
    Refleja la columna del arancel con tipo_doc + entidad emisora + disposición legal.
    """
    nomenclatura = models.ForeignKey(NomenclaturaArancelaria,
                                      on_delete=models.CASCADE,
                                      related_name='documentos_adicionales')
    tipo_doc = models.CharField(max_length=20, help_text="Tipo de documento (ej: 'C*')")
    entidad_emisora = models.CharField(max_length=200,
                                        help_text="Entidad que emite (ej: 'MDPRyA (SENASAG)')")
    disposicion_legal = models.CharField(max_length=200, blank=True, null=True,
                                          help_text="Norma legal de respaldo")

    class Meta:
        ordering = ['nomenclatura', 'tipo_doc']

    def __str__(self):
        return f"{self.tipo_doc} — {self.entidad_emisora}"


# ══════════════════════════════════════════════════════════════════════
# PREFERENCIA ARANCELARIA — Para acuerdos comerciales (CAN, ACE, etc.)
# ══════════════════════════════════════════════════════════════════════

class PreferenciaArancelaria(models.Model):
    """
    Preferencias arancelarias por acuerdos comerciales.
    Una nomenclatura puede tener varias preferencias (CAN, ACE 22 Chile, ACE 66 México, etc.).
    """
    TIPOS_ACUERDO = [
        ('CAN',     'Comunidad Andina'),
        ('ACE_36',  'ACE 36 - Mercosur'),
        ('ACE_47',  'ACE 47'),
        ('VEN',     'Venezuela'),
        ('ACE_22_CHI',  'ACE 22 Chile'),
        ('ACE_22_PROT', 'ACE 22 Protocolo'),
        ('ACE_66_MEX',  'ACE 66 México'),
    ]

    nomenclatura = models.ForeignKey(NomenclaturaArancelaria,
                                      on_delete=models.CASCADE,
                                      related_name='preferencias')
    tipo_acuerdo = models.CharField(max_length=20, choices=TIPOS_ACUERDO)
    porcentaje_desgravacion = models.DecimalField(max_digits=5, decimal_places=2,
                                                    help_text="% de desgravación (0-100)")

    class Meta:
        ordering = ['nomenclatura', 'tipo_acuerdo']
        unique_together = ['nomenclatura', 'tipo_acuerdo']

    def __str__(self):
        return f"{self.get_tipo_acuerdo_display()}: {self.porcentaje_desgravacion}%"


# ══════════════════════════════════════════════════════════════════════
# HISTORIAL DE CONSULTAS — Para historia 5.3 y auditoría 4.1
# ══════════════════════════════════════════════════════════════════════

class HistorialConsulta(models.Model):
    """
    Registro inmutable de consultas realizadas por cada usuario.
    Soporta auditoría profesional según Ley 1990 Art. 38.
    """
    TIPOS_CONSULTA = [
        ('BUSQUEDA',     'Búsqueda por texto/código'),
        ('EXPLORACION',  'Exploración del árbol'),
        ('IA_CLASIFIC',  'Clasificación IA'),
        ('IA_RESUMEN',   'Resumen notas IA'),
        ('CALCULO',      'Cálculo de tributos'),
    ]

    usuario = models.ForeignKey(User, on_delete=models.CASCADE,
                                 related_name='historial_consultas')
    tipo = models.CharField(max_length=20, choices=TIPOS_CONSULTA)
    query = models.TextField(help_text="Término o pregunta realizada")
    resultado_codigo = models.CharField(max_length=20, blank=True, null=True,
                                         help_text="Código arancelario resultante (si aplica)")
    metadata = models.JSONField(default=dict, blank=True,
                                 help_text="Datos adicionales según el tipo de consulta")
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['usuario', '-timestamp']),
            models.Index(fields=['tipo', '-timestamp']),
        ]

    def __str__(self):
        return f"{self.usuario.username} - {self.get_tipo_display()} - {self.timestamp:%Y-%m-%d %H:%M}"


# ══════════════════════════════════════════════════════════════════════
# FAVORITOS — Para historia 5.2
# ══════════════════════════════════════════════════════════════════════

class Favorito(models.Model):
    """
    Partidas guardadas por el despachante para acceso rápido.
    Lista privada limitada a 50 elementos por usuario.
    """
    usuario = models.ForeignKey(User, on_delete=models.CASCADE,
                                 related_name='favoritos')
    nomenclatura = models.ForeignKey(NomenclaturaArancelaria,
                                      on_delete=models.CASCADE,
                                      related_name='favoritos_de_usuarios')
    notas_personales = models.TextField(blank=True, null=True,
                                         help_text="Notas privadas del despachante sobre esta partida")
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-creado_en']
        unique_together = ['usuario', 'nomenclatura']

    def __str__(self):
        return f"{self.usuario.username} ★ {self.nomenclatura.codigo_oficial}"


# ══════════════════════════════════════════════════════════════════════
# TOKEN DE RECUPERACIÓN DE CONTRASEÑA — Para historia 1.2
# ══════════════════════════════════════════════════════════════════════

class PasswordResetToken(models.Model):
    """
    Tokens de recuperación de contraseña con expiración de 60 minutos.
    Implementa criterio 1.2.2 (OWASP Forgot Password Cheat Sheet).
    """
    usuario = models.ForeignKey(User, on_delete=models.CASCADE,
                                 related_name='password_reset_tokens')
    token = models.CharField(max_length=64, unique=True, db_index=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    expira_en = models.DateTimeField()
    usado = models.BooleanField(default=False)

    class Meta:
        ordering = ['-creado_en']

    def __str__(self):
        return f"Token para {self.usuario.username} ({'usado' if self.usado else 'activo'})"

    def es_valido(self):
        return not self.usado and timezone.now() < self.expira_en
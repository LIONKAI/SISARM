from django.db import models
from django.contrib.postgres.indexes import GinIndex # Indexación avanzada de Postgres
from django.contrib.postgres.search import SearchVectorField # Para búsquedas por palabras

class ArancelBusquedaCompleta(models.Model):
    # 1. Códigos Indexados (B-Tree automáticos para búsquedas exactas o parciales)
    codigo_nacional = models.CharField(max_length=11, primary_key=True, help_text="10 u 11 dígitos")
    codigo_nandina = models.CharField(max_length=8, db_index=True)
    codigo_subpartida = models.CharField(max_length=6, db_index=True)
    codigo_partida = models.CharField(max_length=4, db_index=True)
    codigo_capitulo = models.CharField(max_length=2, db_index=True)
    id_seccion = models.CharField(max_length=10, db_index=True)

    # 2. Textos de descripción (Lo que el usuario va a escribir)
    descripcion_mercancia = models.TextField(help_text="Glosa específica del arancel")
    descripcion_capitulo = models.TextField(blank=True, null=True)
    descripcion_seccion = models.TextField(blank=True, null=True)

    # 3. Métricas Financieras y Restricciones (Para filtrar por "Aspectos")
    ga_porcentaje = models.DecimalField(max_digits=5, decimal_places=2, db_index=True) # Filtrar por aranceles altos/bajos
    ice_porcentaje = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    iehd = models.CharField(max_length=100, blank=True, null=True)
    unidad_medida = models.CharField(max_length=20, blank=True, null=True)
    
    # 4. Aspectos Legales y Acuerdos (Búsqueda por certificaciones o convenios)
    documento_adicional = models.TextField(blank=True, null=True, help_text="Ej: SENASAG, IBMETRO")
    preferencia_arancelaria_ace = models.TextField(blank=True, null=True, help_text="Ej: ACE 36, CAN")

    # 5. EL SECRETO DE LA VELOCIDAD: Vector de búsqueda de Postgres
    # Almacena de forma precomputada las palabras clave de las descripciones y documentos
    search_vector = SearchVectorField(null=True, blank=True)

    class Meta:
        # Creamos un índice GIN. Esto hace que buscar "sardinas" en millones de filas sea instantáneo
        indexes = [
            GinIndex(fields=['search_vector'], name='arancel_search_vector_idx')
        ]

    def __str__(self):
        return f"{self.codigo_nacional} - {self.descripcion_mercancia[:30]}"
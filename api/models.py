from django.db import models
from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVectorField


class ArancelBusquedaCompleta(models.Model):
    codigo_nacional = models.CharField(max_length=11, primary_key=True)
    codigo_nandina = models.CharField(max_length=8, db_index=True)
    codigo_subpartida = models.CharField(max_length=6, db_index=True)
    codigo_partida = models.CharField(max_length=4, db_index=True)
    codigo_capitulo = models.CharField(max_length=2, db_index=True)
    id_seccion = models.CharField(max_length=10, db_index=True)
    descripcion_mercancia = models.TextField()
    descripcion_capitulo = models.TextField(blank=True, null=True)
    descripcion_seccion = models.TextField(blank=True, null=True)
    ga_porcentaje = models.DecimalField(max_digits=5, decimal_places=2, db_index=True)
    ice_porcentaje = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    iehd = models.CharField(max_length=100, blank=True, null=True)
    unidad_medida = models.CharField(max_length=20, blank=True, null=True)
    documento_adicional = models.TextField(blank=True, null=True)
    preferencia_arancelaria_ace = models.TextField(blank=True, null=True)
    search_vector = SearchVectorField(null=True, blank=True)

    class Meta:
        indexes = [
            GinIndex(fields=['search_vector'], name='arancel_search_vector_idx')
        ]

    def __str__(self):
        return f"{self.codigo_nacional} - {self.descripcion_mercancia[:30]}"


class NomenclaturaArancelaria(models.Model):
    NIVELES = [
        ('CAPITULO',            'Capítulo'),
        ('PARTIDA',             'Partida'),
        ('AGRUPACION',          'Agrupación'),
        ('SUBPARTIDA_SA',       'Subpartida SA'),
        ('SUBPARTIDA_NACIONAL', 'Subpartida Nacional'),
    ]

    parent = models.ForeignKey('self', null=True, blank=True,
                               on_delete=models.CASCADE, related_name='hijos')
    nivel = models.CharField(max_length=25, choices=NIVELES)
    codigo_oficial = models.CharField(max_length=20, null=True, blank=True, db_index=True)
    descripcion = models.TextField()
    orden = models.IntegerField(default=0)
    is_leaf = models.BooleanField(default=False)
    ga_porcentaje = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    ice_porcentaje = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    unidad_medida = models.CharField(max_length=20, null=True, blank=True)
    doc_adicional = models.TextField(null=True, blank=True)
    preferencias = models.TextField(null=True, blank=True)

    class Meta:
        ordering = ['orden']

    def __str__(self):
        return f"[{self.nivel}] {self.codigo_oficial or 'AGR'} — {self.descripcion[:40]}"
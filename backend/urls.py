from django.contrib import admin
from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from api.views import (
    registrar_usuario, buscar_arancel, buscar_nomenclatura,
    explorador_capitulos, explorador_partidas, explorador_subpartidas
)
urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/registro/', registrar_usuario, name='registrar_usuario'),
    path('api/buscar/', buscar_arancel, name='buscar_arancel'),
    path('api/explorador/capitulos/', explorador_capitulos),
    path('api/explorador/capitulo/<str:capitulo>/', explorador_partidas),
    path('api/explorador/partida/<str:partida>/', explorador_subpartidas),
    path('api/buscar-nomenclatura/', buscar_nomenclatura),
]

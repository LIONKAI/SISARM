from django.contrib import admin
from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from api import views
from api.views import (
    registrar_usuario, buscar_nomenclatura,
    explorador_capitulos, explorador_partidas, explorador_subpartidas, solicitar_recuperacion, restablecer_password
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/registro/', registrar_usuario, name='registrar_usuario'),
    path('api/buscar-nomenclatura/', buscar_nomenclatura, name='buscar_nomenclatura'),
    path('api/explorador/capitulos/', explorador_capitulos),
    path('api/explorador/capitulo/<str:capitulo>/', explorador_partidas),
    path('api/explorador/partida/<str:partida>/', explorador_subpartidas),
    path('api/recuperar-password/', views.solicitar_recuperacion, name='solicitar_recuperacion'),
    path('api/restablecer-password/', views.restablecer_password, name='restablecer_password'),
]
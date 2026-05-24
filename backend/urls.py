from django.contrib import admin
from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from api.views import registrar_usuario # <-- Importamos la vista de tu nueva carpeta
from api.views import registrar_usuario, buscar_arancel #
urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # NUEVA RUTA PARA EL REGISTRO
    path('api/registro/', registrar_usuario, name='registrar_usuario'),
    # <-- NUEVA RUTA PARA EL BUSCADOR INTELIGENTE -->
    path('api/buscar/', buscar_arancel, name='buscar_arancel'),
]
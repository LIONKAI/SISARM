"""
Django settings for backend project.
Compatible con desarrollo local y producción (Railway).
"""

import os
from pathlib import Path
from dotenv import load_dotenv
import dj_database_url

# Cargar variables de entorno desde .env (solo en local)
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent


# ── Configuración de entorno ──────────────────────────────────────────────────

SECRET_KEY = os.environ.get(
    'SECRET_KEY',
    'django-insecure-^&*rh84-zq=s*tg&qx#&h0fwm08#cg)+*g-*r5d3v+&m80l1+6'
)

DEBUG = os.environ.get('DEBUG', 'True') == 'True'

ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '*').split(',')

# Railway proporciona el dominio automáticamente
RAILWAY_DOMAIN = os.environ.get('RAILWAY_PUBLIC_DOMAIN')
if RAILWAY_DOMAIN:
    ALLOWED_HOSTS.append(RAILWAY_DOMAIN)

CSRF_TRUSTED_ORIGINS = [
    f"https://{host}" for host in ALLOWED_HOSTS if host != '*'
]


# ── Aplicaciones ──────────────────────────────────────────────────────────────

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.postgres',
    # Mis aplicaciones
    'aduanas',
    'api',
    'corsheaders',
    'rest_framework',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    # HU 6.4 — Manejo global de excepciones sin exponer tracebacks (CWE-209)
    'backend.middleware.GlobalExceptionMiddleware',
]

ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend.wsgi.application'


# ── Base de datos ─────────────────────────────────────────────────────────────
# En Railway usa DATABASE_URL, en local usa la configuración por defecto

DATABASE_URL = os.environ.get('DATABASE_URL')

if DATABASE_URL:
    # Producción (Railway)
    DATABASES = {
        'default': dj_database_url.parse(DATABASE_URL, conn_max_age=600)
    }
else:
    # Desarrollo local
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': 'sisarm_db',
            'USER': 'postgres',
            'PASSWORD': 'dorolan3',
            'HOST': 'localhost',
            'PORT': '5432',
        }
    }


# ── Validación de contraseñas ─────────────────────────────────────────────────

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


# ── CORS ──────────────────────────────────────────────────────────────────────

CORS_ORIGINS_ENV = os.environ.get('CORS_ALLOWED_ORIGINS', '')

if CORS_ORIGINS_ENV:
    # Producción
    CORS_ALLOWED_ORIGINS = [origin.strip() for origin in CORS_ORIGINS_ENV.split(',')]
    CORS_ALLOW_ALL_ORIGINS = False
else:
    # Desarrollo local
    CORS_ALLOW_ALL_ORIGINS = True
    CORS_ALLOWED_ORIGINS = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]


# ── Internacionalización ──────────────────────────────────────────────────────

LANGUAGE_CODE = 'es-bo'
TIME_ZONE = 'America/La_Paz'
USE_I18N = True
USE_TZ = True


# ── Archivos estáticos ────────────────────────────────────────────────────────

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'


# ── Django REST Framework con JWT ─────────────────────────────────────────────

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    )
}


# ── Default primary key ───────────────────────────────────────────────────────

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
# ══════════════════════════════════════════════════════════════════════
#  CONFIGURACIÓN DE EMAIL — HU 1.2 Recuperación de contraseña
#  Cartero: Gmail SMTP con contraseña de aplicación.
#  Las credenciales se leen de variables de entorno (.env) para no
#  exponerlas en el repositorio. Principio 12-Factor App, factor III.
# ══════════════════════════════════════════════════════════════════════
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = f'SISARM <{EMAIL_HOST_USER}>'

# URL del frontend, usada para construir el enlace de recuperación.
# En producción se sobreescribirá con la URL de Vercel.
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
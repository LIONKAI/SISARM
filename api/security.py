"""
=====================================================================
 SISARM - Capa de seguridad y robustez (HU 6.4)
 Implementa:
   - Rate limiting in-memory para endpoints sensibles
   - Decorador para envolver vistas con rate limit
   - Middleware global de manejo de excepciones (vease backend/middleware.py)

 Justificacion: OWASP Top 10 (A04 Insecure Design, A07 Auth Failures)
 recomienda explicitamente rate limiting contra fuerza bruta y abuso
 de cuota. CWE-209 prohibe exposicion de tracebacks al cliente.
=====================================================================
"""
import time
from collections import defaultdict, deque
from functools import wraps
from rest_framework.response import Response
from rest_framework import status

# Buckets por clave (usuario o IP). Almacena timestamps de las ultimas
# solicitudes para poder contar cuantas hubo en la ventana.
_BUCKETS = defaultdict(deque)


def _purgar_y_contar(clave, ventana_seg):
    ahora = time.time()
    bucket = _BUCKETS[clave]
    limite_inferior = ahora - ventana_seg
    while bucket and bucket[0] < limite_inferior:
        bucket.popleft()
    return len(bucket)


def _registrar(clave):
    _BUCKETS[clave].append(time.time())


def obtener_clave(request, scope):
    """Devuelve una clave estable para rate limiting (usuario+IP o IP)."""
    ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip()
    if not ip:
        ip = request.META.get('REMOTE_ADDR', 'anon')
    if request.user and request.user.is_authenticated:
        return f"{scope}:user:{request.user.id}:{ip}"
    return f"{scope}:ip:{ip}"


def rate_limit(max_requests, ventana_seg, scope='default'):
    """
    Decorador para vistas DRF: limita cuantas solicitudes puede hacer
    un usuario/IP en una ventana de tiempo.

    Ejemplo:
        @rate_limit(max_requests=10, ventana_seg=60, scope='login')
        def mi_vista(request): ...
    """
    def wrapper(view_func):
        @wraps(view_func)
        def wrapped(request, *args, **kwargs):
            clave = obtener_clave(request, scope)
            usados = _purgar_y_contar(clave, ventana_seg)
            if usados >= max_requests:
                retry_after = int(ventana_seg)
                resp = Response(
                    {
                        'error': (
                            f'Demasiadas solicitudes. Intente nuevamente '
                            f'en {retry_after} segundos.'
                        ),
                    },
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )
                resp['Retry-After'] = str(retry_after)
                return resp
            _registrar(clave)
            return view_func(request, *args, **kwargs)
        return wrapped
    return wrapper

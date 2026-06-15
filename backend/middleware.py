"""
=====================================================================
 SISARM - Middleware global de manejo de excepciones (HU 6.4 cri 2)
 Captura excepciones no controladas y devuelve siempre HTTP 500 con
 un mensaje generico (sin trazas). El detalle queda en el log del
 servidor para diagnostico.

 Justificacion: CWE-209 (Information Exposure Through an Error
 Message). Las trazas en el cliente exponen rutas, librerias y la
 arquitectura del backend, facilitando ataques posteriores.
=====================================================================
"""
import logging
import traceback
from django.http import JsonResponse

logger = logging.getLogger('sisarm.global_errors')


class GlobalExceptionMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)

    def process_exception(self, request, exception):
        # Loggear el traceback completo del lado del servidor.
        logger.error(
            "Excepcion no controlada en %s %s: %s",
            request.method, request.path, exception,
            exc_info=True,
        )
        # Cliente solo ve un mensaje generico.
        return JsonResponse(
            {
                'error': (
                    'Ocurrio un error inesperado en el servidor. '
                    'Si el problema persiste, contacte al administrador.'
                ),
            },
            status=500,
        )

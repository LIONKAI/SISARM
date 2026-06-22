"""
═══════════════════════════════════════════════════════════════════════
 SISARM — Asistente Conversacional con Function Calling
 Reemplaza SIS-26, SIS-27 y SIS-14 en una sola HU unificada.

 La IA (Gemini) responde preguntas del despachante apoyándose en
 herramientas que consultan la BD real del arancel. NO inventa datos:
 si la información no está en la BD, lo dice explícitamente.

 Herramientas expuestas a la IA:
   1. buscar_partidas(termino)      — encuentra partidas por descripción
   2. obtener_detalle_partida(cod)  — ficha completa de una partida
   3. listar_capitulos()            — todos los capítulos disponibles
   4. obtener_notas_capitulo(cap)   — notas legales de un capítulo
   5. comparar_partidas(codigos)    — devuelve fichas paralelas
═══════════════════════════════════════════════════════════════════════
"""
import os
import unicodedata
import google.generativeai as genai

from .models import Capitulo, NomenclaturaArancelaria


# ── Configuración del modelo ─────────────────────────────────────────
MODEL_NAME = os.environ.get('GEMINI_MODEL', 'gemini-2.5-flash').strip()


class GeminiNotConfigured(Exception):
    pass


def _quitar_acentos(texto):
    return ''.join(
        c for c in unicodedata.normalize('NFD', texto or '')
        if unicodedata.category(c) != 'Mn'
    ).lower()


def _limpiar_descripcion(desc):
    if not desc:
        return ''
    t = desc.strip()
    while t.startswith('-'):
        t = t.lstrip('-').strip()
    return t


# ══════════════════════════════════════════════════════════════════════
#  TOOLS — funciones que la IA puede invocar para consultar la BD
# ══════════════════════════════════════════════════════════════════════

def buscar_partidas(termino: str) -> dict:
    """Busca partidas arancelarias que coincidan con un termino o descripcion en lenguaje natural.

    Devuelve hasta 8 partidas hoja con codigo, descripcion y capitulo.
    Usar cuando el despachante describe una mercancia sin saber el codigo.
    """
    termino = (termino or '').strip()
    if not termino:
        return {'resultados': [], 'total': 0, 'mensaje': 'Termino vacio'}

    # Busqueda numerica directa
    if termino.replace('.', '').isdigit():
        qs = NomenclaturaArancelaria.objects.filter(
            is_leaf=True, codigo_oficial__startswith=termino,
        ).select_related('capitulo').order_by('orden')[:8]
        resultados = list(qs)
    else:
        # Busqueda textual por palabras
        termino_n = _quitar_acentos(termino)
        palabras = [p for p in termino_n.split() if len(p) >= 3]
        todas = NomenclaturaArancelaria.objects.filter(
            is_leaf=True
        ).select_related('capitulo')
        scored = []
        for n in todas:
            desc_n = _quitar_acentos(n.descripcion or '')
            score = sum(1 for p in palabras if p in desc_n)
            if score > 0:
                scored.append((score, n))
        scored.sort(key=lambda x: -x[0])
        resultados = [n for _, n in scored[:8]]

    return {
        'total': len(resultados),
        'resultados': [{
            'codigo': r.codigo_oficial,
            'descripcion': _limpiar_descripcion(r.descripcion),
            'capitulo': r.capitulo.codigo if r.capitulo else None,
            'capitulo_descripcion': (r.capitulo.descripcion[:80] if r.capitulo else ''),
        } for r in resultados],
    }


def obtener_detalle_partida(codigo: str) -> dict:
    """Devuelve la ficha completa de una partida arancelaria por su codigo oficial.

    Incluye descripcion, gravamen arancelario, unidad de medida, capitulo,
    documentos adicionales requeridos y preferencias arancelarias por acuerdo.
    """
    codigo = (codigo or '').strip()
    nom = NomenclaturaArancelaria.objects.filter(
        is_leaf=True, codigo_oficial=codigo,
    ).select_related('capitulo').first()
    if not nom:
        return {'encontrado': False, 'mensaje': f'No existe la partida {codigo} en la BD.'}

    ruta = []
    nodo = nom.parent
    while nodo:
        if nodo.codigo_oficial:
            ruta.insert(0, nodo.codigo_oficial)
        nodo = nodo.parent

    docs = list(nom.documentos_adicionales.values(
        'tipo_doc', 'entidad_emisora', 'disposicion_legal'
    ))
    prefs = list(nom.preferencias.values(
        'tipo_acuerdo', 'porcentaje_desgravacion'
    ))

    return {
        'encontrado': True,
        'codigo': nom.codigo_oficial,
        'descripcion': _limpiar_descripcion(nom.descripcion),
        'ruta_jerarquica': ' > '.join(ruta) if ruta else nom.codigo_oficial,
        'gravamen_arancelario_pct': (
            str(nom.ga_porcentaje) if nom.ga_porcentaje is not None else '0'
        ),
        'unidad_medida': nom.unidad_medida or 'no especificada',
        'ice_iehd': nom.ice_iehd or 'no aplica',
        'despacho_frontera': nom.despacho_frontera or 'no aplica',
        'capitulo_codigo': nom.capitulo.codigo if nom.capitulo else None,
        'capitulo_descripcion': nom.capitulo.descripcion if nom.capitulo else '',
        'documentos_adicionales': docs,
        'preferencias_arancelarias': prefs,
    }


def listar_capitulos() -> dict:
    """Lista los capitulos del Arancel Aduanero Boliviano disponibles en el sistema.

    Util cuando el despachante pregunta que rangos cubre el sistema o quiere
    explorar por capitulo.
    """
    caps = Capitulo.objects.all().order_by('codigo')
    return {
        'total': caps.count(),
        'capitulos': [{
            'codigo': c.codigo,
            'descripcion': c.descripcion,
            'seccion': c.seccion or '',
        } for c in caps],
    }


def obtener_notas_capitulo(codigo_capitulo: str) -> dict:
    """Devuelve las notas legales completas de un capitulo del arancel.

    Las notas legales son criticas para la clasificacion correcta. Usar
    cuando el despachante pregunta sobre exclusiones, inclusiones o
    definiciones de un capitulo.
    """
    codigo_capitulo = (codigo_capitulo or '').strip().zfill(2)
    cap = Capitulo.objects.filter(codigo=codigo_capitulo).first()
    if not cap:
        return {'encontrado': False, 'mensaje': f'No existe el capitulo {codigo_capitulo}.'}
    return {
        'encontrado': True,
        'codigo': cap.codigo,
        'descripcion': cap.descripcion,
        'notas_legales': cap.notas_legales or 'Sin notas legales registradas.',
    }


def comparar_partidas(codigos: list) -> dict:
    """Devuelve fichas paralelas de varias partidas para compararlas.

    Acepta una lista de codigos arancelarios (ej: ['0101.21.00', '0101.29.00'])
    y devuelve los datos clave de cada una para que la IA explique las
    diferencias al despachante.
    """
    if not codigos or not isinstance(codigos, list):
        return {'comparacion': [], 'mensaje': 'Se requiere una lista de codigos.'}
    resultado = []
    for cod in codigos[:5]:  # max 5 para no saturar
        detalle = obtener_detalle_partida(cod)
        resultado.append(detalle)
    return {'comparacion': resultado, 'total': len(resultado)}


# Lista de tools que se pasan a Gemini
TOOLS = [
    buscar_partidas,
    obtener_detalle_partida,
    listar_capitulos,
    obtener_notas_capitulo,
    comparar_partidas,
]


# ══════════════════════════════════════════════════════════════════════
#  ORQUESTACION DEL CHAT
# ══════════════════════════════════════════════════════════════════════

SYSTEM_INSTRUCTION = """Eres SISARM Assistant, un experto despachante de aduana boliviano que ayuda a otros despachantes a clasificar mercancias, entender el arancel y resolver dudas operativas.

REGLAS ESTRICTAS:
1. SIEMPRE que el usuario pregunte sobre una partida, descripcion, capitulo, notas legales o datos del arancel, DEBES llamar a las herramientas disponibles para consultar la base de datos. NUNCA inventes codigos, gravamenes, descripciones ni datos.
2. Si la BD no tiene la informacion (por ejemplo, el sistema solo carga capitulos 01, 02 y 03 actualmente), dilo claramente al usuario en vez de inventar.
3. Cuando recomiendes una partida, MENCIONA SIEMPRE el codigo exacto y de donde sale el dato (de la BD).
4. Cuando expliques notas legales o requisitos, citalas tal como salen de la herramienta.
5. Si la pregunta no tiene que ver con el arancel aduanero, mercancias o clasificacion (por ejemplo: recetas, deportes, programacion general), responde brevemente que tu alcance es solo el arancel aduanero boliviano.
6. Recuerda al usuario, cuando sea relevante, que la responsabilidad final de la clasificacion recae en el despachante autorizado (Ley 1990).

ESTILO:
- Respuestas concisas, profesionales, en espanol.
- Usa formato markdown cuando ayude (listas, codigo en backticks, negritas para codigos arancelarios).
- Si das un codigo arancelario, usalo en formato monoespaciado: `0101.21.00`.
- Si hay varias opciones razonables, listalas y explica brevemente cada una.
"""


def _get_model():
    api_key = os.environ.get('GEMINI_API_KEY', '').strip()
    if not api_key:
        raise GeminiNotConfigured(
            "Falta GEMINI_API_KEY en .env. Genere una en https://aistudio.google.com/apikey"
        )
    genai.configure(api_key=api_key)
    return genai.GenerativeModel(
        MODEL_NAME,
        tools=TOOLS,
        system_instruction=SYSTEM_INSTRUCTION,
    )


def responder_chat(messages: list) -> dict:
    """Procesa una conversacion completa y devuelve la respuesta del asistente.

    Args:
        messages: lista de mensajes en formato
            [{'role': 'user'|'assistant', 'content': '...'}]
            El ultimo mensaje debe ser del usuario.

    Returns:
        {
            'reply': str (respuesta en markdown),
            'tools_used': [str, ...] (nombres de herramientas invocadas),
        }
    """
    if not messages:
        return {'reply': 'Hola, en que puedo ayudarte con el arancel hoy?', 'tools_used': []}

    # Separamos el historial del ultimo mensaje del usuario
    *historial, ultimo = messages
    if ultimo.get('role') != 'user':
        return {'reply': 'El ultimo mensaje debe ser del usuario.', 'tools_used': []}

    # Convertimos historial al formato de Gemini
    # Gemini usa 'user' y 'model' (no 'assistant')
    history_gemini = []
    for m in historial:
        role = 'user' if m.get('role') == 'user' else 'model'
        content = m.get('content', '')
        if content:
            history_gemini.append({'role': role, 'parts': [content]})

    model = _get_model()
    chat = model.start_chat(
        history=history_gemini,
        enable_automatic_function_calling=True,
    )

    response = chat.send_message(ultimo['content'])

    # Detectar tools usadas (function calls en el historial post-respuesta)
    tools_used = []
    for msg in chat.history:
        for part in msg.parts:
            if hasattr(part, 'function_call') and part.function_call:
                fname = getattr(part.function_call, 'name', None)
                if fname and fname not in tools_used:
                    tools_used.append(fname)

    return {
        'reply': (response.text or '').strip(),
        'tools_used': tools_used,
    }

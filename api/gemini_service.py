"""
═══════════════════════════════════════════════════════════════════════
 SISARM — Servicio de integración con Google Gemini
 Capa de aislamiento de la API de IA. Todas las llamadas a Gemini
 pasan por aquí para que las vistas no dependan del SDK directamente.

 Cubre las HU:
   · SIS-26 — Clasificar por lenguaje natural   → clasificar_descripcion()
   · SIS-27 — Resumir notas explicativas        → resumir_notas()  [pendiente]
   · SIS-14 — Comparar con partidas similares   → comparar_partidas()  [pendiente]

 Requiere la variable de entorno GEMINI_API_KEY en el archivo .env.
═══════════════════════════════════════════════════════════════════════
"""
import os
import json
import google.generativeai as genai


# Modelo Flash — gratis hasta 250 requests/día en gemini-2.5-flash,
# latencia baja. Se puede sobreescribir vía variable de entorno
# GEMINI_MODEL si se quiere probar otra versión.
# Modelos vigentes (2026):
#   gemini-2.5-flash       (recomendado, default)
#   gemini-2.0-flash       (alternativa, tier free amplio)
#   gemini-flash-latest    (alias al modelo Flash más reciente)
#   gemini-2.5-pro         (mayor calidad, cuota más baja)
MODEL_NAME = os.environ.get('GEMINI_MODEL', 'gemini-2.5-flash').strip()


class GeminiNotConfigured(Exception):
    """Se lanza cuando no hay API key configurada."""
    pass


class GeminiInvalidResponse(Exception):
    """Se lanza cuando la respuesta del modelo no es JSON parseable."""
    pass


def _get_model():
    """Devuelve una instancia del modelo Gemini lista para usar."""
    api_key = os.environ.get('GEMINI_API_KEY', '').strip()
    if not api_key:
        raise GeminiNotConfigured(
            "Falta la variable GEMINI_API_KEY en el archivo .env. "
            "Genere una en https://aistudio.google.com/apikey"
        )
    genai.configure(api_key=api_key)
    return genai.GenerativeModel(MODEL_NAME)


def _extraer_json(texto):
    """
    Limpia la respuesta del modelo para devolver JSON puro.
    Gemini a veces envuelve la respuesta en bloques ```json ... ```
    aunque se le pida no hacerlo.
    """
    texto = texto.strip()
    if texto.startswith('```'):
        # Quitar el primer ```json o ``` y el último ```
        partes = texto.split('```')
        if len(partes) >= 2:
            texto = partes[1]
            if texto.lower().startswith('json'):
                texto = texto[4:]
        texto = texto.strip()
    try:
        return json.loads(texto)
    except json.JSONDecodeError as e:
        raise GeminiInvalidResponse(
            f"La IA devolvió una respuesta no parseable: {str(e)[:120]}"
        )


# ──────────────────────────────────────────────────────────────────────
#  SIS-26 — Clasificación por lenguaje natural
# ──────────────────────────────────────────────────────────────────────
def clasificar_descripcion(descripcion_usuario, candidatos):
    """
    Pide a Gemini que elija la partida arancelaria más adecuada para
    una mercancía descrita en lenguaje natural.

    Args:
        descripcion_usuario: texto libre del despachante
            (ej: "importo telas de algodón crudo para confección de polleras")
        candidatos: lista de dicts pre-filtrados de la BD, cada uno con
            keys: codigo_oficial, descripcion, capitulo_desc

    Returns:
        dict con la sugerencia:
        {
          "codigo_sugerido": "5208.11.00",
          "descripcion_partida": "Tejidos de algodón ...",
          "confianza": "alta" | "media" | "baja",
          "justificacion": "...",
          "alternativas": [
            {"codigo": "5208.12.00", "razon": "..."},
            ...
          ]
        }

    Raises:
        GeminiNotConfigured: si no hay API key.
        GeminiInvalidResponse: si la respuesta no es JSON válido.
    """
    if not candidatos:
        return {
            'codigo_sugerido': '',
            'descripcion_partida': '',
            'confianza': 'baja',
            'justificacion': (
                'No se encontraron partidas candidatas mediante búsqueda textual. '
                'Intente con una descripción más específica o explore manualmente.'
            ),
            'alternativas': [],
        }

    candidatos_text = "\n".join([
        f"- {c['codigo_oficial']} | {c['descripcion']} | Capítulo: {c['capitulo_desc']}"
        for c in candidatos
    ])

    prompt = f"""Eres un experto despachante aduanero boliviano con dominio del Arancel Aduanero Boliviano. Tu tarea es clasificar una mercancía descrita en lenguaje natural eligiendo la partida arancelaria más adecuada de una lista de candidatos.

DESCRIPCIÓN DE LA MERCANCÍA:
"{descripcion_usuario}"

CANDIDATOS POSIBLES (pre-seleccionados por coincidencia textual):
{candidatos_text}

INSTRUCCIONES:
1. Analiza con cuidado la descripción de la mercancía.
2. De la lista de candidatos, elige el que MEJOR clasifique la mercancía.
3. Asigna un nivel de confianza:
   - "alta": la descripción del usuario coincide claramente con la partida elegida.
   - "media": hay margen de duda razonable, pero la elección es la más probable.
   - "baja": la descripción es ambigua o ningún candidato calza bien.
4. Da una justificación breve (1-2 oraciones) explicando por qué elegiste esa partida.
5. Lista hasta 3 alternativas si las hay, cada una con razón breve.
6. Si NINGÚN candidato corresponde a la mercancía descrita, devuelve codigo_sugerido vacío "" y confianza "baja".

RESPONDE EXCLUSIVAMENTE EN ESTE FORMATO JSON (sin texto adicional, sin markdown, sin ```):
{{
  "codigo_sugerido": "código de la lista o vacío",
  "descripcion_partida": "descripción de la partida elegida",
  "confianza": "alta" | "media" | "baja",
  "justificacion": "1-2 oraciones",
  "alternativas": [
    {{"codigo": "...", "razon": "..."}}
  ]
}}"""

    model = _get_model()
    response = model.generate_content(prompt)
    return _extraer_json(response.text)

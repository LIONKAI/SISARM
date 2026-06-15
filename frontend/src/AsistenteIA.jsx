import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL;

// Asistente IA - Chat conversacional con acceso a la BD del arancel.
// Reemplaza SIS-26, SIS-27 y SIS-14 en una sola interfaz.
// La IA usa function calling para consultar la BD real (no inventa).
export default function AsistenteIA({ token }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');
    const scrollRef = useRef(null);
    const inputRef = useRef(null);

    const auth = { headers: { Authorization: `Bearer ${token}` } };

    const sugerencias = [
        '¿Qué capítulos del arancel tiene cargados el sistema?',
        'Importo carne de bovino congelada deshuesada, ¿qué partida uso?',
        'Resume las notas legales del capítulo 03',
        'Compara las partidas 0101.21.00 y 0101.29.00',
        '¿Qué documentos necesito para importar caballos vivos reproductores?',
    ];

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, cargando]);

    useEffect(() => {
        if (!cargando && inputRef.current) inputRef.current.focus();
    }, [cargando]);

    const enviar = async (texto) => {
        const contenido = (texto ?? input).trim();
        if (!contenido) return;
        if (contenido.length > 1000) {
            setError('El mensaje es demasiado largo (máximo 1000 caracteres).');
            return;
        }
        const nuevoMensaje = { role: 'user', content: contenido };
        const nuevosMensajes = [...messages, nuevoMensaje];
        setMessages(nuevosMensajes);
        setInput('');
        setError('');
        setCargando(true);
        try {
            const res = await axios.post(`${API}/chat-ia/`, { messages: nuevosMensajes }, auth);
            const reply = res.data.reply || '(sin respuesta)';
            const tools = res.data.tools_used || [];
            setMessages([...nuevosMensajes, { role: 'assistant', content: reply, tools_used: tools }]);
        } catch (err) {
            const code = err.response?.status;
            const msg = err.response?.data?.error;
            if (code === 401) setError('Su sesión expiró. Vuelva a iniciar sesión.');
            else if (code === 503) setError(msg || 'El servicio de IA no está configurado.');
            else if (code === 502) setError(msg || 'La IA no respondió. Intente nuevamente.');
            else setError(msg || 'Error al consultar la IA.');
            setMessages(messages);
            setInput(contenido);
        } finally {
            setCargando(false);
        }
    };

    const limpiarChat = () => { setMessages([]); setError(''); setInput(''); };

    const onKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 130px)', maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <h1 style={{ margin: 0, fontSize: '22px', color: '#111827' }}>⚡ Asistente IA del Arancel</h1>
                    {messages.length > 0 && (
                        <button onClick={limpiarChat} style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer' }}>
                            🗑 Nueva conversación
                        </button>
                    )}
                </div>
                <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '13px' }}>
                    Pregunte lo que necesite sobre el arancel. La IA consulta la base de datos real.
                </p>
            </div>

            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {messages.length === 0 && !cargando && (
                    <Bienvenida sugerencias={sugerencias} onClick={enviar} />
                )}
                {messages.map((m, i) => <Burbuja key={i} mensaje={m} />)}
                {cargando && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', fontSize: '14px' }}>
                        <span className="dot-flashing" /><span>Pensando…</span>
                    </div>
                )}
            </div>

            {error && (
                <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: '6px', border: '1px solid #fca5a5', marginTop: '10px', fontSize: '13px' }}>
                    ⚠️ {error}
                </div>
            )}

            <div style={{ marginTop: '12px', display: 'flex', gap: '8px', padding: '10px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="Escriba su pregunta… (Enter para enviar, Shift+Enter para nueva línea)"
                    rows={2}
                    maxLength={1000}
                    disabled={cargando}
                    style={{ flex: 1, padding: '8px 10px', fontSize: '14px', border: 'none', outline: 'none', resize: 'none', fontFamily: 'inherit' }}
                />
                <button onClick={() => enviar()} disabled={cargando || !input.trim()} style={{ padding: '0 18px', fontSize: '14px', fontWeight: '600', backgroundColor: cargando || !input.trim() ? '#93c5fd' : '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: cargando || !input.trim() ? 'not-allowed' : 'pointer', minWidth: '90px' }}>
                    {cargando ? '…' : 'Enviar'}
                </button>
            </div>

            <div style={{ marginTop: '6px', fontSize: '11px', color: '#9ca3af', textAlign: 'center' }}>
                ℹ️ La responsabilidad final de la clasificación recae sobre el despachante autorizado (Ley 1990).
            </div>

            <style>{`
                .dot-flashing { position: relative; width: 8px; height: 8px; border-radius: 50%; background-color: #3b82f6; animation: dotFlashing 1s infinite linear alternate; }
                @keyframes dotFlashing { 0% { opacity: 1; } 100% { opacity: 0.2; } }
            `}</style>
        </div>
    );
}

function Burbuja({ mensaje }) {
    const esUsuario = mensaje.role === 'user';
    return (
        <div style={{ display: 'flex', justifyContent: esUsuario ? 'flex-end' : 'flex-start' }}>
            <div style={{ maxWidth: '78%', padding: '10px 14px', borderRadius: esUsuario ? '14px 14px 4px 14px' : '14px 14px 14px 4px', backgroundColor: esUsuario ? '#3b82f6' : '#f3f4f6', color: esUsuario ? 'white' : '#111827', fontSize: '14px', lineHeight: '1.5', wordWrap: 'break-word' }}>
                {esUsuario ? (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{mensaje.content}</div>
                ) : (
                    <>
                        <Markdown text={mensaje.content} />
                        {mensaje.tools_used && mensaje.tools_used.length > 0 && (
                            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e5e7eb', fontSize: '11px', color: '#6b7280' }}>
                                🔍 Consultó: {mensaje.tools_used.map(formatearTool).join(', ')}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function formatearTool(nombre) {
    const map = {
        buscar_partidas: 'búsqueda de partidas',
        obtener_detalle_partida: 'ficha de partida',
        listar_capitulos: 'listado de capítulos',
        obtener_notas_capitulo: 'notas legales',
        comparar_partidas: 'comparación de partidas',
    };
    return map[nombre] || nombre;
}

function Markdown({ text }) {
    const lineas = (text || '').split('\n');
    return (
        <div>
            {lineas.map((linea, i) => {
                const trimmed = linea.trimStart();
                const esItem = trimmed.startsWith('- ') || trimmed.startsWith('* ');
                const contenido = esItem ? trimmed.slice(2) : linea;
                return (
                    <div key={i} style={{ paddingLeft: esItem ? '16px' : 0, position: 'relative', marginBottom: linea.trim() === '' ? '6px' : '2px' }}>
                        {esItem && <span style={{ position: 'absolute', left: '4px', color: '#6b7280' }}>•</span>}
                        <InlineFormat texto={contenido} />
                    </div>
                );
            })}
        </div>
    );
}

function InlineFormat({ texto }) {
    const partes = [];
    let i = 0;
    const t = texto || '';
    let buffer = '';
    const flush = () => { if (buffer) { partes.push({ tipo: 'texto', valor: buffer }); buffer = ''; } };
    while (i < t.length) {
        if (t.slice(i, i + 2) === '**') {
            const fin = t.indexOf('**', i + 2);
            if (fin !== -1) { flush(); partes.push({ tipo: 'bold', valor: t.slice(i + 2, fin) }); i = fin + 2; continue; }
        }
        if (t[i] === '`') {
            const fin = t.indexOf('`', i + 1);
            if (fin !== -1) { flush(); partes.push({ tipo: 'code', valor: t.slice(i + 1, fin) }); i = fin + 1; continue; }
        }
        buffer += t[i]; i++;
    }
    flush();
    return (
        <>
            {partes.map((p, idx) => {
                if (p.tipo === 'bold') return <strong key={idx}>{p.valor}</strong>;
                if (p.tipo === 'code') return <code key={idx} style={{ fontFamily: 'monospace', backgroundColor: 'rgba(0,0,0,0.06)', padding: '1px 5px', borderRadius: '3px', fontSize: '0.93em' }}>{p.valor}</code>;
                return <span key={idx}>{p.valor}</span>;
            })}
        </>
    );
}

function Bienvenida({ sugerencias, onClick }) {
    return (
        <div style={{ textAlign: 'center', padding: '20px 10px' }}>
            <div style={{ fontSize: '48px', marginBottom: '8px' }}>💬</div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#374151' }}>Hola, soy SISARM Assistant</div>
            <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px', marginBottom: '20px' }}>
                Puedo clasificar mercancías, explicar partidas, comparar opciones y resumir notas legales. Pregúnteme lo que necesite.
            </div>
            <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                Sugerencias para empezar
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                {sugerencias.map((s, i) => (
                    <button key={i} onClick={() => onClick(s)} style={{ padding: '8px 14px', fontSize: '12px', backgroundColor: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', borderRadius: '16px', cursor: 'pointer', textAlign: 'left', maxWidth: '380px' }}>
                        {s}
                    </button>
                ))}
            </div>
        </div>
    );
}

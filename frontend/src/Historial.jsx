import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL;

const TIPOS = {
    'BUSQUEDA': 'Búsqueda',
    'EXPLORACION': 'Exploración / Reporte',
    'IA_CLASIFIC': 'Clasificación IA',
    'IA_RESUMEN': 'Resumen IA',
    'CALCULO': 'Cálculo de tributos',
};

const fmtFecha = (iso) => new Date(iso).toLocaleString('es-BO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
});

// ══════════════════════════════════════════════════════════════════════
//  HISTORIAL DE CONSULTAS — Historia 5.3 (SIS-24)
//  Lista privada e inmutable: el backend solo expone GET.
//  Filtros: palabra clave, rango de fechas, tipo de consulta.
// ══════════════════════════════════════════════════════════════════════
export default function Historial({ token }) {
    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [mostrando, setMostrando] = useState(0);
    const [limite, setLimite] = useState(500);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    const [filtroQ, setFiltroQ] = useState('');
    const [filtroDesde, setFiltroDesde] = useState('');
    const [filtroHasta, setFiltroHasta] = useState('');
    const [filtroTipo, setFiltroTipo] = useState('');

    const cargar = async () => {
        setCargando(true);
        setError('');
        const params = new URLSearchParams();
        if (filtroQ.trim()) params.set('q', filtroQ.trim());
        if (filtroDesde) params.set('desde', filtroDesde);
        if (filtroHasta) params.set('hasta', filtroHasta);
        if (filtroTipo) params.set('tipo', filtroTipo);

        try {
            const res = await axios.get(
                `${API}/historial/?${params.toString()}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setItems(res.data.historial);
            setTotal(res.data.total_filtrado);
            setMostrando(res.data.mostrando);
            setLimite(res.data.limite);
        } catch (err) {
            setError(err.response?.status === 401
                ? 'Su sesión expiró. Vuelva a iniciar sesión.'
                : 'No se pudo cargar el historial.');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => { cargar(); }, []);

    const limpiar = () => {
        setFiltroQ(''); setFiltroDesde(''); setFiltroHasta(''); setFiltroTipo('');
    };

    return (
        <div>
            <div style={st.aviso}>
                🔒 Registro inmutable de auditoría — Ley 1990 Art. 38. Las consultas no pueden editarse ni eliminarse.
            </div>

            <div style={st.filtros}>
                <input type="text" placeholder="🔍 Palabra clave o código…"
                    value={filtroQ} onChange={(e) => setFiltroQ(e.target.value)} style={st.input} />
                <input type="date" value={filtroDesde}
                    onChange={(e) => setFiltroDesde(e.target.value)} style={st.input} title="Desde" />
                <input type="date" value={filtroHasta}
                    onChange={(e) => setFiltroHasta(e.target.value)} style={st.input} title="Hasta" />
                <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} style={st.input}>
                    <option value="">Todos los tipos</option>
                    {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <button onClick={cargar} style={st.btnPrimario}>Aplicar</button>
                <button onClick={limpiar} style={st.btnSec}>Limpiar</button>
            </div>

            {cargando && <p style={st.texto}>Cargando historial…</p>}
            {error && <div style={st.error}>{error}</div>}

            {!cargando && !error && (
                <>
                    <div style={st.resumen}>
                        Mostrando <b>{mostrando}</b> de <b>{total}</b> consultas
                        {total >= limite && ` (limitado a ${limite})`}
                    </div>

                    {items.length === 0 ? (
                        <div style={st.vacio}>
                            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
                            <p>No hay consultas registradas con esos criterios.</p>
                        </div>
                    ) : (
                        <div style={st.tabla}>
                            <div style={st.cabecera}>
                                <div>Fecha y hora</div>
                                <div>Tipo</div>
                                <div>Consulta</div>
                                <div>Código</div>
                            </div>
                            {items.map((h) => (
                                <div key={h.id} style={st.fila}>
                                    <div style={st.celdaFecha}>{fmtFecha(h.timestamp)}</div>
                                    <div><span style={st.badge(h.tipo)}>{h.tipo_display}</span></div>
                                    <div style={st.celdaQuery}>
                                        {h.metadata?.descripcion ? (
                                            <>
                                                <div style={{ fontWeight: 600, color: '#111827' }}>
                                                    {h.metadata.descripcion}
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                                                    búsqueda: "{h.query}"
                                                </div>
                                            </>
                                        ) : (
                                            h.query
                                        )}
                                    </div>
                                    <div style={st.celdaCod}>{h.resultado_codigo || '—'}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

const st = {
    aviso: {
        backgroundColor: '#fffbeb', border: '1px solid #fcd34d',
        color: '#92400e', padding: '10px 14px', borderRadius: '6px',
        fontSize: '13px', marginBottom: '16px',
    },
    filtros: {
        display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr auto auto',
        gap: '10px', marginBottom: '16px',
    },
    input: {
        padding: '8px 10px', fontSize: '13px',
        border: '1px solid #d1d5db', borderRadius: '6px',
        outline: 'none', boxSizing: 'border-box',
    },
    btnPrimario: {
        padding: '8px 14px', fontSize: '13px', fontWeight: 600,
        color: 'white', backgroundColor: '#1e3a8a', border: 'none',
        borderRadius: '6px', cursor: 'pointer',
    },
    btnSec: {
        padding: '8px 14px', fontSize: '13px', color: '#374151',
        backgroundColor: 'transparent', border: '1px solid #d1d5db',
        borderRadius: '6px', cursor: 'pointer',
    },
    resumen: { fontSize: '13px', color: '#6b7280', marginBottom: '10px' },
    vacio: { textAlign: 'center', color: '#9ca3af', paddingTop: '40px', fontSize: '14px' },
    error: {
        color: '#991b1b', backgroundColor: '#fef2f2', border: '1px solid #fecaca',
        padding: '12px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px',
    },
    texto: { color: '#6b7280', fontSize: '14px' },
    tabla: {
        border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden',
        backgroundColor: 'white',
    },
    cabecera: {
        display: 'grid', gridTemplateColumns: '180px 160px 1fr 140px',
        backgroundColor: '#f9fafb', padding: '10px 14px',
        fontSize: '12px', fontWeight: 700, color: '#374151',
        borderBottom: '1px solid #e5e7eb',
    },
    fila: {
        display: 'grid', gridTemplateColumns: '180px 160px 1fr 140px',
        padding: '10px 14px', fontSize: '13px',
        borderBottom: '1px solid #f3f4f6', alignItems: 'center',
    },
    celdaFecha: { color: '#374151', fontFamily: 'monospace', fontSize: '12px' },
    celdaQuery: { color: '#111827' },
    celdaCod: { fontFamily: 'monospace', color: '#1e3a8a', fontWeight: 600 },
    badge: (tipo) => ({
        display: 'inline-block', fontSize: '11px', fontWeight: 600,
        padding: '3px 8px', borderRadius: '12px',
        backgroundColor: tipo === 'BUSQUEDA' ? '#dbeafe'
                       : tipo === 'EXPLORACION' ? '#dcfce7' : '#f3f4f6',
        color: tipo === 'BUSQUEDA' ? '#1e3a8a'
             : tipo === 'EXPLORACION' ? '#166534' : '#374151',
    }),
};
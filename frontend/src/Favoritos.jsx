import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL;

// ══════════════════════════════════════════════════════════════════════
//  VISTA DE FAVORITOS — Historia 5.2 (SIS-23)
//  Lista privada del despachante (criterio 5.2.2): el GET usa el token,
//  así el backend solo devuelve los favoritos de este usuario.
//  El contador X/50 refleja el tope del criterio 5.2.1.
// ══════════════════════════════════════════════════════════════════════
export default function Favoritos({ token }) {
    const [favoritos, setFavoritos] = useState([]);
    const [limite, setLimite] = useState(50);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [editandoId, setEditandoId] = useState(null);
    const [notaTemporal, setNotaTemporal] = useState('');

    const auth = { headers: { Authorization: `Bearer ${token}` } };

    const cargarFavoritos = async () => {
        setCargando(true);
        setError('');
        try {
            const res = await axios.get(`${API}/favoritos/`, auth);
            setFavoritos(res.data.favoritos);
            setLimite(res.data.limite);
        } catch (err) {
            setError(err.response?.status === 401
                ? 'Su sesión expiró. Vuelva a iniciar sesión.'
                : 'No se pudieron cargar los favoritos. Intente nuevamente.');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => { cargarFavoritos(); }, []);

    const eliminar = async (id) => {
        try {
            await axios.delete(`${API}/favoritos/${id}/`, auth);
            setFavoritos((prev) => prev.filter((f) => f.id !== id));
        } catch (err) {
            setError('No se pudo eliminar el favorito.');
        }
    };

    const empezarEdicion = (fav) => {
        setEditandoId(fav.id);
        setNotaTemporal(fav.notas_personales || '');
    };

    const guardarNota = async (id) => {
        try {
            const res = await axios.patch(`${API}/favoritos/${id}/`,
                { notas_personales: notaTemporal }, auth);
            setFavoritos((prev) => prev.map((f) => (f.id === id ? res.data : f)));
            setEditandoId(null);
            setNotaTemporal('');
        } catch (err) {
            setError('No se pudo guardar la nota.');
        }
    };

    if (cargando) return <p style={st.aviso}>Cargando favoritos…</p>;

    return (
        <div>
            <div style={st.header}>
                <span style={st.contador}>{favoritos.length} / {limite} favoritos</span>
            </div>

            {error && <div style={st.error}>{error}</div>}

            {favoritos.length === 0 && !error ? (
                <div style={st.vacio}>
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>⭐</div>
                    <p>Aún no tienes partidas guardadas.<br />
                    Búscalas y usa el botón ☆ de la ficha para guardarlas aquí.</p>
                </div>
            ) : (
                <div style={st.lista}>
                    {favoritos.map((fav) => (
                        <div key={fav.id} style={st.tarjeta}>
                            <div style={st.tarjetaTop}>
                                <div>
                                    <div style={st.codigo}>{fav.codigo_oficial}</div>
                                    <div style={st.desc}>{fav.descripcion}</div>
                                    <div style={st.meta}>
                                        Capítulo {fav.capitulo} · GA {fav.ga_porcentaje}%
                                        {fav.unidad_medida ? ` · ${fav.unidad_medida}` : ''}
                                    </div>
                                </div>
                                <button onClick={() => eliminar(fav.id)} style={st.btnEliminar}
                                    title="Quitar de favoritos">✕</button>
                            </div>

                            {editandoId === fav.id ? (
                                <div style={st.notaEdicion}>
                                    <textarea
                                        value={notaTemporal}
                                        onChange={(e) => setNotaTemporal(e.target.value)}
                                        placeholder="Escribe una nota personal sobre esta partida…"
                                        style={st.notaInput}
                                        rows={2}
                                    />
                                    <div style={st.notaBotones}>
                                        <button onClick={() => guardarNota(fav.id)} style={st.btnGuardarNota}>Guardar</button>
                                        <button onClick={() => setEditandoId(null)} style={st.btnCancelar}>Cancelar</button>
                                    </div>
                                </div>
                            ) : (
                                <div style={st.notaVista} onClick={() => empezarEdicion(fav)}>
                                    {fav.notas_personales
                                        ? <span>📝 {fav.notas_personales}</span>
                                        : <span style={st.notaVacia}>+ Agregar nota personal</span>}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

const st = {
    header: { display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' },
    contador: {
        fontSize: '13px', fontWeight: 600, color: '#92400e', backgroundColor: '#fffbeb',
        border: '1px solid #fcd34d', padding: '6px 12px', borderRadius: '20px',
    },
    aviso: { color: '#6b7280', fontSize: '14px' },
    error: {
        color: '#991b1b', backgroundColor: '#fef2f2', border: '1px solid #fecaca',
        padding: '12px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px',
    },
    vacio: { textAlign: 'center', color: '#9ca3af', paddingTop: '60px', fontSize: '15px', lineHeight: 1.6 },
    lista: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' },
    tarjeta: {
        backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '10px',
        padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    },
    tarjetaTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' },
    codigo: { fontFamily: 'monospace', fontWeight: 700, fontSize: '15px', color: '#1e3a8a' },
    desc: { fontSize: '13px', color: '#374151', margin: '4px 0' },
    meta: { fontSize: '12px', color: '#059669', fontWeight: 600 },
    btnEliminar: {
        flexShrink: 0, width: '28px', height: '28px', borderRadius: '6px',
        border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#dc2626',
        cursor: 'pointer', fontSize: '14px', lineHeight: 1,
    },
    notaVista: {
        marginTop: '12px', padding: '8px 10px', borderRadius: '6px', backgroundColor: '#f9fafb',
        fontSize: '13px', color: '#374151', cursor: 'pointer', border: '1px dashed #d1d5db',
    },
    notaVacia: { color: '#9ca3af' },
    notaEdicion: { marginTop: '12px' },
    notaInput: {
        width: '100%', padding: '8px', fontSize: '13px', borderRadius: '6px', border: '1px solid #d1d5db',
        boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit',
    },
    notaBotones: { display: 'flex', gap: '8px', marginTop: '8px' },
    btnGuardarNota: {
        padding: '6px 14px', fontSize: '13px', fontWeight: 600, color: 'white',
        backgroundColor: '#3b82f6', border: 'none', borderRadius: '6px', cursor: 'pointer',
    },
    btnCancelar: {
        padding: '6px 14px', fontSize: '13px', color: '#6b7280', backgroundColor: 'transparent',
        border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer',
    },
};
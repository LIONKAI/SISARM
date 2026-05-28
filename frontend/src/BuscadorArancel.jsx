import React, { useState } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL;

// ──────────────────────────────────────────────────────────────────────
//  Mapa de nombres legibles para los acuerdos comerciales.
//  El backend manda códigos cortos (CAN, ACE_36...). Aquí los traducimos
//  al nombre que entiende el despachante.
// ──────────────────────────────────────────────────────────────────────
const NOMBRES_ACUERDO = {
    CAN: 'Comunidad Andina (CAN)',
    ACE_36: 'ACE 36 — Mercosur',
    ACE_47: 'ACE 47',
    VEN: 'Venezuela',
    ACE_22_CHI: 'ACE 22 — Chile',
    ACE_22_PROT: 'ACE 22 — Protocolo',
    ACE_66_MEX: 'ACE 66 — México',
};

// Convención numérica boliviana: punto para miles, coma para decimales.
// Sustento: criterio 2.3.3 (RAE / SIN Bolivia).
const fmtBs = (n) =>
    Number(n).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function BuscadorArancel() {
    const [textoDeLaBarra, setTextoDeLaBarra] = useState('');
    const [resultados, setResultados] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [seleccionado, setSeleccionado] = useState(null); // ficha activa
    const [busquedaHecha, setBusquedaHecha] = useState(false);

    const realizarBusqueda = async (valorABuscar) => {
        if (!valorABuscar.trim()) {
            setResultados([]);
            setBusquedaHecha(false);
            return;
        }
        setCargando(true);
        try {
            const respuesta = await axios.get(
                `${API}/buscar-nomenclatura/?q=${encodeURIComponent(valorABuscar)}`
            );
            setResultados(respuesta.data.resultados);
            setBusquedaHecha(true);
        } catch (error) {
            console.error('Error al conectar con el motor de búsqueda:', error);
        } finally {
            setCargando(false);
        }
    };

    const handleInputChange = (e) => {
        const valor = e.target.value;
        setTextoDeLaBarra(valor);
        realizarBusqueda(valor);
    };

    return (
        <div style={st.contenedor}>
            {/* ════════ COLUMNA IZQUIERDA: BÚSQUEDA + LISTA ════════ */}
            <div style={st.columnaIzq}>
                <input
                    type="text"
                    placeholder="🔍 Busque por descripción o código (ej. 0101)"
                    value={textoDeLaBarra}
                    onChange={handleInputChange}
                    style={st.input}
                />

                {cargando && <p style={st.aviso}>Buscando…</p>}

                {!cargando && busquedaHecha && resultados.length === 0 && (
                    <p style={st.aviso}>No se encontraron mercancías por ese criterio.</p>
                )}

                <div style={st.lista}>
                    {resultados.map((item) => {
                        const activo = seleccionado && seleccionado.id === item.id;
                        return (
                            <div
                                key={item.id}
                                onClick={() => setSeleccionado(item)}
                                style={{
                                    ...st.itemLista,
                                    ...(activo ? st.itemActivo : {}),
                                }}
                            >
                                <div style={st.itemCodigo}>{item.codigo_oficial}</div>
                                <div style={st.itemDesc}>{item.descripcion}</div>
                                <div style={st.itemGa}>GA {item.ga_porcentaje}%</div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ════════ COLUMNA DERECHA: FICHA COMPLETA ════════ */}
            <div style={st.columnaDer}>
                {seleccionado ? (
                    <Ficha item={seleccionado} />
                ) : (
                    <div style={st.fichaVacia}>
                        <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
                        <p>Seleccione una mercancía de la lista<br />para ver su ficha completa.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════
//  FICHA COMPLETA — Historia 2.2
//  Secciones diferenciadas (criterio 2.2.2 - chunking de Miller):
//  General · Tributos · Calculadora CIF · Sustento Legal · Preferencias
// ══════════════════════════════════════════════════════════════════════
function Ficha({ item }) {
    const tieneDocs = item.documentos_adicionales && item.documentos_adicionales.length > 0;

    return (
        <div>
            {/* Encabezado */}
            <div style={st.fichaHeader}>
                <div style={st.fichaCodigo}>{item.codigo_oficial}</div>
                <div style={st.fichaTitulo}>{item.descripcion}</div>
                {/* Ruta jerárquica — criterio 2.2.1 */}
                {item.ruta && (
                    <div style={st.fichaRuta}>
                        Capítulo {item.capitulo} › {item.ruta}
                    </div>
                )}
            </div>

            {/* ── SECCIÓN: DATOS GENERALES Y TRIBUTOS ── */}
            <Seccion titulo="Datos generales y tributos" color="#3b82f6">
                <div style={st.grid}>
                    <Dato etiqueta="Gravamen Arancelario (GA)" valor={`${item.ga_porcentaje}%`} />
                    <Dato etiqueta="Unidad de medida" valor={item.unidad_medida || '—'} />
                    <Dato etiqueta="ICE / IEHD" valor={item.ice_iehd || 'No aplica'} />
                    <Dato etiqueta="Despacho en frontera" valor={item.despacho_frontera || '—'} />
                </div>
            </Seccion>

            {/* ── SECCIÓN: CALCULADORA CIF — Historia 2.3 ── */}
            <CalculadoraCIF gaPorcentaje={parseFloat(item.ga_porcentaje) || 0} />

            {/* ── SECCIÓN: DOCUMENTOS ADICIONALES (destacada) — criterio 2.2.4 ── */}
            <Seccion titulo="Documentos adicionales requeridos" color="#dc2626">
                {tieneDocs ? (
                    <div style={st.docsAlerta}>
                        {item.documentos_adicionales.map((doc, i) => (
                            <div key={i} style={st.docItem}>
                                <span style={st.docTipo}>{doc.tipo_doc}</span>
                                <div>
                                    <div style={{ fontWeight: 600 }}>{doc.entidad_emisora}</div>
                                    {doc.disposicion_legal && (
                                        <div style={st.docLegal}>{doc.disposicion_legal}</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p style={st.sinDatos}>Esta mercancía no requiere documentación adicional.</p>
                )}
            </Seccion>

            {/* ── SECCIÓN: PREFERENCIAS ARANCELARIAS ── */}
            <Seccion titulo="Preferencias arancelarias por acuerdo comercial" color="#16a34a">
                {item.preferencias && item.preferencias.length > 0 ? (
                    <div style={st.prefGrid}>
                        {item.preferencias.map((p, i) => {
                            const desg = parseFloat(p.porcentaje_desgravacion);
                            const liberado = desg >= 100;
                            return (
                                <div key={i} style={st.prefItem}>
                                    <span>{NOMBRES_ACUERDO[p.tipo_acuerdo] || p.tipo_acuerdo}</span>
                                    <span
                                        style={{
                                            ...st.prefBadge,
                                            backgroundColor: liberado ? '#dcfce7' : '#f3f4f6',
                                            color: liberado ? '#166534' : '#6b7280',
                                        }}
                                    >
                                        {desg}%
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p style={st.sinDatos}>Sin preferencias registradas.</p>
                )}
            </Seccion>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════
//  CALCULADORA CIF — Historia 2.3
//  Cálculo en cascada (criterio 2.3.2 - DS 25870 Art. 132):
//    GA  = CIF × ga%
//    ICE = (CIF + GA) × ice%      [aquí ice = 0 por defecto, editable a futuro]
//    IVA = (CIF + GA + ICE) × 14.94%
//  El IVA efectivo de importación en Bolivia es 14.94% (tasa nominal 13%
//  aplicada "por dentro": 13 / 87).
// ══════════════════════════════════════════════════════════════════════
function CalculadoraCIF({ gaPorcentaje }) {
    const [cif, setCif] = useState('');
    const valorCif = parseFloat(cif) || 0;

    const ga = valorCif * (gaPorcentaje / 100);
    const baseIce = valorCif + ga;
    const ice = 0; // Placeholder: el ICE varía por producto; se conectará después.
    const baseIva = valorCif + ga + ice;
    const IVA_TASA = 0.1494;
    const iva = baseIva * IVA_TASA;
    const total = valorCif + ga + ice + iva;

    return (
        <Seccion titulo="Calculadora de tributos sobre valor CIF" color="#f59e0b">
            <label style={st.cifLabel}>Valor CIF de la mercancía (Bs)</label>
            <input
                type="number"
                min="0"
                placeholder="Ingrese el valor CIF, ej. 10000"
                value={cif}
                onChange={(e) => setCif(e.target.value)}
                style={st.cifInput}
            />

            {valorCif > 0 && (
                <div style={st.cifResultado}>
                    <FilaCalc etiqueta={`Valor CIF`} valor={valorCif} />
                    <FilaCalc etiqueta={`Gravamen Arancelario (${gaPorcentaje}%)`} valor={ga} />
                    <FilaCalc etiqueta={`ICE / IEHD`} valor={ice} nota="(no aplica)" />
                    <FilaCalc etiqueta={`IVA importación (14,94%)`} valor={iva} />
                    <div style={st.cifTotal}>
                        <span>TOTAL A PAGAR</span>
                        <span>Bs {fmtBs(total)}</span>
                    </div>
                    <p style={st.cifNota}>
                        Cálculo en cascada según DS 25870 Art. 132. El ICE se incorporará
                        por producto en una etapa posterior.
                    </p>
                </div>
            )}
        </Seccion>
    );
}

function FilaCalc({ etiqueta, valor, nota }) {
    return (
        <div style={st.filaCalc}>
            <span style={{ color: '#6b7280' }}>
                {etiqueta} {nota && <em style={{ fontSize: '12px' }}>{nota}</em>}
            </span>
            <span style={{ fontWeight: 600 }}>Bs {fmtBs(valor)}</span>
        </div>
    );
}

// ── Componentes auxiliares de presentación ──
function Seccion({ titulo, color, children }) {
    return (
        <div style={st.seccion}>
            <div style={{ ...st.seccionTitulo, borderLeftColor: color }}>{titulo}</div>
            <div style={st.seccionBody}>{children}</div>
        </div>
    );
}

function Dato({ etiqueta, valor }) {
    return (
        <div>
            <div style={st.datoEtiqueta}>{etiqueta}</div>
            <div style={st.datoValor}>{valor}</div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════
//  ESTILOS
// ══════════════════════════════════════════════════════════════════════
const st = {
    contenedor: {
        display: 'flex',
        gap: '20px',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
    },
    columnaIzq: {
        flex: '1 1 340px',
        minWidth: '300px',
    },
    columnaDer: {
        flex: '2 1 480px',
        minWidth: '300px',
        backgroundColor: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '10px',
        padding: '24px',
        minHeight: '400px',
    },
    input: {
        width: '100%',
        padding: '12px 14px',
        fontSize: '15px',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        marginBottom: '16px',
        boxSizing: 'border-box',
        outline: 'none',
    },
    aviso: { color: '#6b7280', fontSize: '14px' },
    lista: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxHeight: '600px',
        overflowY: 'auto',
    },
    itemLista: {
        padding: '12px 14px',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        cursor: 'pointer',
        backgroundColor: 'white',
        transition: 'all 0.15s',
    },
    itemActivo: {
        borderColor: '#3b82f6',
        backgroundColor: '#eff6ff',
        boxShadow: '0 0 0 1px #3b82f6',
    },
    itemCodigo: { fontFamily: 'monospace', fontWeight: 700, fontSize: '14px', color: '#1e3a8a' },
    itemDesc: { fontSize: '13px', color: '#374151', margin: '2px 0' },
    itemGa: { fontSize: '12px', color: '#059669', fontWeight: 600 },

    fichaVacia: {
        textAlign: 'center',
        color: '#9ca3af',
        paddingTop: '80px',
        fontSize: '15px',
        lineHeight: 1.6,
    },
    fichaHeader: { marginBottom: '20px', paddingBottom: '16px', borderBottom: '2px solid #e5e7eb' },
    fichaCodigo: { fontFamily: 'monospace', fontSize: '22px', fontWeight: 700, color: '#1e3a8a' },
    fichaTitulo: { fontSize: '17px', color: '#111827', marginTop: '4px', fontWeight: 600 },
    fichaRuta: { fontSize: '13px', color: '#6b7280', marginTop: '6px' },

    seccion: { marginBottom: '18px', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' },
    seccionTitulo: {
        padding: '10px 14px',
        backgroundColor: '#f9fafb',
        borderLeft: '4px solid',
        fontWeight: 600,
        fontSize: '14px',
        color: '#374151',
    },
    seccionBody: { padding: '14px' },

    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' },
    datoEtiqueta: { fontSize: '12px', color: '#6b7280', marginBottom: '2px' },
    datoValor: { fontSize: '15px', color: '#111827', fontWeight: 600 },

    docsAlerta: { display: 'flex', flexDirection: 'column', gap: '10px' },
    docItem: {
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '6px',
        padding: '10px 12px',
    },
    docTipo: {
        fontFamily: 'monospace',
        fontWeight: 700,
        color: '#dc2626',
        backgroundColor: '#fee2e2',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '13px',
    },
    docLegal: { fontSize: '12px', color: '#6b7280', marginTop: '2px' },
    sinDatos: { color: '#6b7280', fontSize: '14px', margin: 0 },

    prefGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' },
    prefItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '13px',
        padding: '8px 10px',
        backgroundColor: '#f9fafb',
        borderRadius: '6px',
    },
    prefBadge: { padding: '2px 8px', borderRadius: '12px', fontWeight: 700, fontSize: '12px' },

    cifLabel: { display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '6px' },
    cifInput: {
        width: '100%',
        padding: '10px 12px',
        fontSize: '15px',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        boxSizing: 'border-box',
        outline: 'none',
    },
    cifResultado: { marginTop: '14px' },
    filaCalc: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '8px 0',
        borderBottom: '1px solid #f3f4f6',
        fontSize: '14px',
    },
    cifTotal: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '12px 0 4px',
        fontWeight: 700,
        fontSize: '16px',
        color: '#92400e',
    },
    cifNota: { fontSize: '11px', color: '#9ca3af', marginTop: '8px', lineHeight: 1.5 },
};
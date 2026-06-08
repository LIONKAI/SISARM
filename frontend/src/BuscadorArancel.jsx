import React, { useState, useEffect } from 'react';
import axios from 'axios';


const API = import.meta.env.VITE_API_URL;

// ──────────────────────────────────────────────────────────────────────
//  Enlaces directos a documentos oficiales — criterio 2.2.5 (SIS-32).
//  Mapeo verificado contra los portales oficiales del Estado Plurinacional
//  de Bolivia y de la Organización Mundial de Aduanas.
// ──────────────────────────────────────────────────────────────────────
const ENLACES_NORMATIVA = [
    {
        patron: /\bLey\s*1990\b/i,
        url: 'https://www.aduana.gob.bo/lga-view',
    },
    {
        patron: /\b(D\.?S\.?|Decreto\s*Supremo)\s*25870\b/i,
        url: 'https://senavex.gob.bo/wp-content/uploads/2020/04/Decreto-Supremo-N%C2%B0-25870-Reglamento-Ley-General-de-Aduanas.pdf',
    },
    {
        patron: /\bLey\s*830\b/i,
        url: 'https://www.senasag.gob.bo/index.php/normativas-y-resoluciones/ley-830',
    },
];

const SITIOS_OFICIALES_BO = [
    'gacetaoficialdebolivia.gob.bo',
    'aduana.gob.bo',
    'senasag.gob.bo',
    'lexivox.org',
];

// Devuelve la URL al documento oficial. Si la norma está en el mapa,
// enlace directo. Si no, búsqueda restringida a portales oficiales.
const urlNormativa = (disposicion) => {
    if (!disposicion || !disposicion.trim()) return null;
    for (const n of ENLACES_NORMATIVA) {
        if (n.patron.test(disposicion)) return n.url;
    }
    const sites = SITIOS_OFICIALES_BO.map(s => `site:${s}`).join(' OR ');
    const consulta = encodeURIComponent(`${disposicion} ${sites}`);
    return `https://www.google.com/search?q=${consulta}`;
};
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

export default function BuscadorArancel({ token }) {
    const [textoDeLaBarra, setTextoDeLaBarra] = useState('');
    const [resultados, setResultados] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [seleccionado, setSeleccionado] = useState(null); // ficha activa
    const [busquedaHecha, setBusquedaHecha] = useState(false);
    // Debounce — la búsqueda se dispara 400ms después de la última tecla.
    // Evita inundar el backend y el historial con búsquedas parciales (HU 5.3).
    useEffect(() => {
        const timer = setTimeout(() => {
            realizarBusqueda(textoDeLaBarra);
        }, 400);
        return () => clearTimeout(timer);
    }, [textoDeLaBarra]);

    const realizarBusqueda = async (valorABuscar) => {
        if (!valorABuscar.trim()) {
            setResultados([]);
            setBusquedaHecha(false);
            return;
        }
        setCargando(true);
        try {
            const respuesta = await axios.get(
                `${API}/buscar-nomenclatura/?q=${encodeURIComponent(valorABuscar)}`,
                // Token opcional: si está logueado, el backend registra la
                // búsqueda en su historial (HU 5.3 / SIS-24).
                token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
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
        setTextoDeLaBarra(e.target.value);
    };
// Registra la consulta al hacer clic en un resultado (HU 5.3 / SIS-24).
    // Silencioso: si falla, no afecta la experiencia del despachante.
    const handleSeleccionar = async (item) => {
        setSeleccionado(item);
        if (!token) return;
        try {
            await axios.post(
                `${API}/historial/registrar/`,
                { nomenclatura_id: item.id, query_origen: textoDeLaBarra },
                { headers: { Authorization: `Bearer ${token}` } }
            );
        } catch (_) { /* auditoría no bloquea la UX */ }
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
                                onClick={() => handleSeleccionar(item)}
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
                    <Ficha item={seleccionado} token={token} />
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
function Ficha({ item, token }) {
        const tieneDocs = item.documentos_adicionales && item.documentos_adicionales.length > 0;

    return (
        <div>
            {/* Encabezado */}
            <div style={st.fichaHeader}>
                <div style={st.fichaCodigo}>{item.codigo_oficial}</div>
                <div style={st.fichaTitulo}>{item.descripcion}</div>
                {/* Botón guardar en favoritos — HU 5.2 (SIS-23) */}
                <BotonFavorito key={item.id} nomenclaturaId={item.id} token={token} />
                {/* Botón exportar a PDF — HU 5.1 (SIS-22) */}
                <BotonExportarPDF
                    key={`pdf-${item.id}`}
                    nomenclaturaId={item.id}
                    codigoOficial={item.codigo_oficial}
                    token={token}
                />
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
            {/* ── SECCIÓN: SUSTENTO LEGAL Y NOTAS EXPLICATIVAS — criterio 2.2.5 ── */}
            <Seccion titulo="Sustento legal y notas explicativas" color="#7c3aed">
                <SustentoLegal item={item} />
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

// ══════════════════════════════════════════════════════════════════════
//  BOTÓN GUARDAR EN FAVORITOS — Historia 5.2 (SIS-23)
//  Manda nomenclatura_id al backend con el token en el header.
//  El backend previene duplicados (409) y aplica el tope de 50 (409).
// ══════════════════════════════════════════════════════════════════════
function BotonFavorito({ nomenclaturaId, token }) {
    const [estado, setEstado] = useState('idle'); // idle | guardando | guardado | yaExiste | error
    const [mensaje, setMensaje] = useState('');

    const guardar = async () => {
        setEstado('guardando');
        setMensaje('');
        try {
            await axios.post(
                `${API}/favoritos/`,
                { nomenclatura_id: nomenclaturaId },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setEstado('guardado');
        } catch (err) {
            const detalle = err.response?.data?.error || '';
            if (err.response?.status === 409 && detalle.toLowerCase().includes('límite')) {
                setEstado('error');
                setMensaje(detalle);
            } else if (err.response?.status === 409) {
                setEstado('yaExiste');
            } else if (err.response?.status === 401) {
                setEstado('error');
                setMensaje('Su sesión expiró. Vuelva a iniciar sesión.');
            } else {
                setEstado('error');
                setMensaje('No se pudo guardar el favorito. Intente nuevamente.');
            }
        }
    };

    if (estado === 'guardado') {
        return <div style={st.favGuardado}>★ Guardado en favoritos</div>;
    }
    if (estado === 'yaExiste') {
        return <div style={st.favGuardado}>★ Ya está en tus favoritos</div>;
    }

    return (
        <div>
            <button onClick={guardar} disabled={estado === 'guardando'} style={st.favBoton}>
                {estado === 'guardando' ? '☆ Guardando…' : '☆ Guardar en favoritos'}
            </button>
            {estado === 'error' && <div style={st.favError}>{mensaje}</div>}
        </div>
    );
}
// ══════════════════════════════════════════════════════════════════════
//  BOTÓN EXPORTAR A PDF — Historia 5.1 (SIS-22)
//  Descarga el reporte de clasificación firmado por el sistema.
//  Recibe el PDF como blob y dispara la descarga vía link sintético.
// ══════════════════════════════════════════════════════════════════════
function BotonExportarPDF({ nomenclaturaId, codigoOficial, token }) {
    const [descargando, setDescargando] = useState(false);
    const [error, setError] = useState('');

    const exportar = async () => {
        setDescargando(true);
        setError('');
        try {
            const res = await axios.get(
                `${API}/exportar-pdf/${nomenclaturaId}/`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                    responseType: 'blob',
                }
            );
            // Descarga vía link sintético — patrón estándar para blobs autenticados
            const url = window.URL.createObjectURL(res.data);
            const link = document.createElement('a');
            link.href = url;
            link.download = `SISARM_${codigoOficial}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            if (err.response?.status === 401) {
                setError('Su sesión expiró. Vuelva a iniciar sesión.');
            } else {
                setError('No se pudo generar el PDF. Intente nuevamente.');
            }
        } finally {
            setDescargando(false);
        }
    };

    return (
        <div>
            <button onClick={exportar} disabled={descargando} style={st.pdfBoton}>
                {descargando ? '⏳ Generando PDF…' : '📄 Exportar a PDF'}
            </button>
            {error && <div style={st.favError}>{error}</div>}
        </div>
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
//  SUSTENTO LEGAL — Historia 2.2 (SIS-32), criterio 2.2.5
//  Consolida notas OMA, notas del capítulo, disposiciones legales únicas
//  de los documentos requeridos y marco normativo general aplicable.
// ══════════════════════════════════════════════════════════════════════
function SustentoLegal({ item }) {
    const disposicionesUnicas = [...new Set(
        (item.documentos_adicionales || [])
            .map(d => d.disposicion_legal)
            .filter(d => d && d.trim())
    )];

    const tieneNotasPartida = item.notas_explicativas && item.notas_explicativas.trim();
    const tieneNotasCapitulo = item.capitulo_notas_legales && item.capitulo_notas_legales.trim();

    return (
        <div>
            {tieneNotasPartida && (
                <div style={st.sustBloque}>
                    <div style={st.sustEtiqueta}>📖 Notas explicativas (OMA)</div>
                    <div style={st.sustTexto}>{item.notas_explicativas}</div>
                </div>
            )}

            {tieneNotasCapitulo && (
                <div style={st.sustBloque}>
                    <div style={st.sustEtiqueta}>📜 Notas del Capítulo {item.capitulo}</div>
                    <div style={st.sustTexto}>{item.capitulo_notas_legales}</div>
                </div>
            )}

            {disposicionesUnicas.length > 0 && (
                <div style={st.sustBloque}>
                    <div style={st.sustEtiqueta}>⚖️ Disposiciones legales aplicables</div>
                    <ul style={st.sustLista}>
                        {disposicionesUnicas.map((d, i) => (
                            <li key={i} style={st.sustItem}>
                                <a href={urlNormativa(d)} target="_blank"
                                    rel="noopener noreferrer" style={st.sustEnlace}>
                                    {d}
                                </a>
                                <span style={st.sustHint}> ↗ documento oficial</span>
                            </li>
                         ))}
                    </ul>
                </div>
            )}

            <div style={st.sustBloque}>
                <div style={st.sustEtiqueta}>🏛️ Marco normativo general</div>
                <ul style={st.sustLista}>
                    <li style={st.sustItem}>
                        <a href="https://www.aduana.gob.bo/lga-view" target="_blank"
                            rel="noopener noreferrer" style={st.sustEnlace}>
                            <b>Ley 1990 (General de Aduanas)</b>
                        </a>
                        <span style={st.sustHint}> ↗</span> — Art. 6 (tributos), Art. 38 (documentación de despacho).
                    </li>
                    <li style={st.sustItem}>
                        <a href="https://senavex.gob.bo/wp-content/uploads/2020/04/Decreto-Supremo-N%C2%B0-25870-Reglamento-Ley-General-de-Aduanas.pdf"
                            target="_blank" rel="noopener noreferrer" style={st.sustEnlace}>
                            <b>D.S. 25870 (Reglamento)</b>
                        </a>
                        <span style={st.sustHint}> ↗ PDF</span> — Art. 132, cálculo en cascada de tributos sobre base CIF.
                    </li>
                    <li style={st.sustItem}>
                        <a href="https://www.wcoomd.org/en/topics/nomenclature/instrument-and-tools/hs-nomenclature-2022-edition.aspx"
                            target="_blank" rel="noopener noreferrer" style={st.sustEnlace}>
                            <b>Sistema Armonizado OMA — Nomenclatura 2022</b>
                        </a>
                        <span style={st.sustHint}> ↗</span> — Reglas Generales de Interpretación para clasificación.
                    </li>
                </ul>
            </div>

            {!tieneNotasPartida && !tieneNotasCapitulo && disposicionesUnicas.length === 0 && (
                <p style={st.sustVacio}>
                    No hay notas explicativas específicas cargadas para esta partida.
                    Aplica el marco normativo general indicado arriba.
                </p>
            )}
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
    favBoton: {
        marginTop: '12px', padding: '8px 14px', fontSize: '14px', fontWeight: 600,
        color: '#92400e', backgroundColor: '#fffbeb', border: '1px solid #fcd34d',
        borderRadius: '6px', cursor: 'pointer',
    },
    favGuardado: {
        marginTop: '12px', padding: '8px 14px', fontSize: '14px', fontWeight: 600,
        color: '#166534', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0',
        borderRadius: '6px', display: 'inline-block',
    },
    favError: { marginTop: '8px', fontSize: '13px', color: '#dc2626' },
    favError: { marginTop: '8px', fontSize: '13px', color: '#dc2626' },
    pdfBoton: {
        marginTop: '8px', padding: '8px 14px', fontSize: '14px', fontWeight: 600,
        color: 'white', backgroundColor: '#1e3a8a', border: 'none',
        borderRadius: '6px', cursor: 'pointer',
    },
    sustBloque: { marginBottom: '14px' },
    sustEtiqueta: {
        fontSize: '13px', fontWeight: 700, color: '#5b21b6',
        marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px',
    },
    sustEnlace: {
        color: '#7c3aed', textDecoration: 'none', fontWeight: 600,
        borderBottom: '1px dashed #c4b5fd',
    },
    sustHint: {
        color: '#9ca3af', fontSize: '11px', marginLeft: '4px',
    },
    sustTexto: {
        fontSize: '13px', color: '#374151', lineHeight: 1.6,
        padding: '10px 12px', backgroundColor: '#faf5ff',
        border: '1px solid #e9d5ff', borderRadius: '6px',
        whiteSpace: 'pre-wrap',
    },
    sustLista: { margin: 0, padding: 0, listStyle: 'none' },
    sustItem: {
        fontSize: '13px', color: '#374151', lineHeight: 1.5,
        padding: '6px 10px', marginBottom: '4px',
        backgroundColor: '#faf5ff', borderLeft: '3px solid #a855f7',
        borderRadius: '4px',
    },
    sustVacio: {
        color: '#6b7280', fontSize: '13px', fontStyle: 'italic', margin: 0,
    },

};
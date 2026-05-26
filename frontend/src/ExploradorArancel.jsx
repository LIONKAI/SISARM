import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL;

const NIVEL_COLORS = {
  capitulo:   { bg: '#1e3a5f', accent: '#3b82f6' },
  partida:    { bg: '#1a4731', accent: '#22c55e' },
  subpartida: { bg: '#4a1942', accent: '#a855f7' },
};

function EtiquetaGA({ valor }) {
  const n = parseFloat(valor);
  const color = n === 0 ? '#22c55e' : n <= 10 ? '#f59e0b' : n <= 20 ? '#f97316' : '#ef4444';
  return (
    <span style={{
      backgroundColor: color + '18', color, border: `1px solid ${color}40`,
      padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
    }}>
      {valor}%
    </span>
  );
}

function TarjetaCapitulo({ capitulo, seleccionado, onClick }) {
  const activo = seleccionado?.codigo_capitulo === capitulo.codigo_capitulo;
  return (
    <div onClick={() => onClick(capitulo)} style={{
      padding: '12px 16px', borderRadius: '8px', cursor: 'pointer',
      border: `2px solid ${activo ? NIVEL_COLORS.capitulo.accent : '#e5e7eb'}`,
      backgroundColor: activo ? '#eff6ff' : 'white',
      transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '12px',
    }}>
      <div style={{
        width: '38px', height: '38px', borderRadius: '8px', flexShrink: 0,
        backgroundColor: activo ? NIVEL_COLORS.capitulo.accent : '#f3f4f6',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: activo ? 'white' : '#6b7280', fontWeight: 'bold', fontSize: '12px',
      }}>{capitulo.codigo_capitulo}</div>
      <div style={{ flexGrow: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', color: '#111827', fontWeight: '500',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {capitulo.descripcion || `Capítulo ${capitulo.codigo_capitulo}`}
        </div>
        <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
          {capitulo.total_partidas} registros
        </div>
      </div>
      {activo && <span style={{ color: NIVEL_COLORS.capitulo.accent, fontSize: '16px', flexShrink: 0 }}>›</span>}
    </div>
  );
}

function TarjetaPartida({ partida, seleccionada, onClick }) {
  const activa = seleccionada?.codigo_partida === partida.codigo_partida;
  return (
    <div onClick={() => onClick(partida)} style={{
      padding: '12px 16px', borderRadius: '8px', cursor: 'pointer',
      border: `2px solid ${activa ? NIVEL_COLORS.partida.accent : '#e5e7eb'}`,
      backgroundColor: activa ? '#f0fdf4' : 'white',
      transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '12px',
    }}>
      <div style={{
        width: '52px', height: '34px', borderRadius: '6px', flexShrink: 0,
        backgroundColor: activa ? NIVEL_COLORS.partida.accent : '#f3f4f6',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: activa ? 'white' : '#6b7280', fontWeight: 'bold', fontSize: '11px',
      }}>{partida.codigo_partida}</div>
      <div style={{ flexGrow: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', color: '#111827',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {partida.descripcion}
        </div>
        <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
          {partida.total_subpartidas} subpartidas nacionales
        </div>
      </div>
      {activa && <span style={{ color: NIVEL_COLORS.partida.accent, fontSize: '16px', flexShrink: 0 }}>›</span>}
    </div>
  );
}

function FilaSubpartida({ sub, index }) {
  const [expandida, setExpandida] = useState(false);
  const par = index % 2 === 0;
  return (
    <>
      <tr onClick={() => setExpandida(!expandida)} style={{
        backgroundColor: par ? '#fafafa' : 'white', cursor: 'pointer',
      }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f0f9ff'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = par ? '#fafafa' : 'white'}
      >
        <td style={{ padding: '11px 16px', fontFamily: 'monospace', fontSize: '13px',
          fontWeight: 'bold', color: '#1e3a8a', whiteSpace: 'nowrap' }}>
          {sub.codigo_nacional}
        </td>
        <td style={{ padding: '11px 16px', fontSize: '13px', color: '#374151' }}>
          {sub.descripcion_mercancia}
        </td>
        <td style={{ padding: '11px 16px', textAlign: 'center' }}>
          <EtiquetaGA valor={sub.ga_porcentaje} />
        </td>
        <td style={{ padding: '11px 16px', textAlign: 'center', fontSize: '12px', color: '#6b7280' }}>
          {sub.unidad_medida || '—'}
        </td>
        <td style={{ padding: '11px 16px', textAlign: 'center', fontSize: '12px',
          color: sub.documento_adicional ? '#ef4444' : '#9ca3af', fontWeight: sub.documento_adicional ? '600' : 'normal' }}>
          {sub.documento_adicional || '—'}
        </td>
        <td style={{ padding: '11px 16px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
          {expandida ? '▲' : '▼'}
        </td>
      </tr>
      {expandida && (
        <tr style={{ backgroundColor: '#f0f9ff' }}>
          <td colSpan={6} style={{ padding: '14px 20px', borderBottom: '1px solid #e0f2fe' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              {[
                { label: 'CÓDIGO NANDINA', value: sub.codigo_nandina, mono: true, color: '#1e3a8a' },
                { label: 'ICE', value: sub.ice_porcentaje ? sub.ice_porcentaje + '%' : '—' },
                { label: 'PREFERENCIAS ACE/CAN', value: sub.preferencia_arancelaria_ace || '—' },
                { label: 'DOCUMENTO ADICIONAL', value: sub.documento_adicional || 'No requerido',
                  color: sub.documento_adicional ? '#ef4444' : '#9ca3af' },
              ].map(({ label, value, mono, color }) => (
                <div key={label}>
                  <div style={{ fontSize: '10px', color: '#9ca3af', fontWeight: '600',
                    letterSpacing: '0.8px', marginBottom: '4px' }}>{label}</div>
                  <div style={{ fontSize: '13px', fontFamily: mono ? 'monospace' : 'inherit',
                    color: color || '#374151', fontWeight: mono ? 'bold' : 'normal' }}>{value}</div>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function ExploradorArancel() {
  const [capitulos, setCapitulos] = useState([]);
  const [partidas, setPartidas] = useState([]);
  const [subpartidas, setSubpartidas] = useState([]);
  const [capituloSel, setCapituloSel] = useState(null);
  const [partidaSel, setPartidaSel] = useState(null);
  const [cargandoCaps, setCargandoCaps] = useState(true);
  const [cargandoParts, setCargandoParts] = useState(false);
  const [cargandoSubs, setCargandoSubs] = useState(false);

  useEffect(() => {
    axios.get(`${API}/explorador/capitulos/`)
      .then(r => setCapitulos(r.data.capitulos))
      .catch(console.error)
      .finally(() => setCargandoCaps(false));
  }, []);

  const seleccionarCapitulo = (cap) => {
    setCapituloSel(cap);
    setPartidaSel(null);
    setSubpartidas([]);
    setPartidas([]);
    setCargandoParts(true);
    axios.get(`${API}/explorador/capitulo/${cap.codigo_capitulo}/`)
      .then(r => setPartidas(r.data.partidas))
      .catch(console.error)
      .finally(() => setCargandoParts(false));
  };

  const seleccionarPartida = (part) => {
    setPartidaSel(part);
    setSubpartidas([]);
    setCargandoSubs(true);
    axios.get(`${API}/explorador/partida/${part.codigo_partida}/`)
      .then(r => setSubpartidas(r.data.subpartidas))
      .catch(console.error)
      .finally(() => setCargandoSubs(false));
  };

  const volverACapitulos = () => {
    setCapituloSel(null);
    setPartidaSel(null);
    setPartidas([]);
    setSubpartidas([]);
  };

  const volverAPartidas = () => {
    setPartidaSel(null);
    setSubpartidas([]);
  };

  const colBase = {
    backgroundColor: 'white', borderRadius: '10px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  };

  const encabezado = (color, texto) => (
    <div style={{
      padding: '13px 16px', backgroundColor: color, color: 'white',
      fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', flexShrink: 0,
    }}>{texto}</div>
  );

  const lista = { overflowY: 'auto', flexGrow: 1, padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' };
  const vacio = (msg) => <div style={{ textAlign: 'center', color: '#9ca3af', padding: '30px 10px', fontSize: '13px' }}>{msg}</div>;

  if (!capituloSel) {
    return (
      <div>
        <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
          Selecciona un capítulo para comenzar a explorar
        </div>
        <div style={{ ...colBase, maxHeight: '520px' }}>
          {encabezado(NIVEL_COLORS.capitulo.bg, `📁 CAPÍTULOS (${capitulos.length})`)}
          <div style={lista}>
            {cargandoCaps ? vacio('Cargando...') :
              capitulos.map(c => (
                <TarjetaCapitulo key={c.codigo_capitulo} capitulo={c}
                  seleccionado={capituloSel} onClick={seleccionarCapitulo} />
              ))
            }
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px',
        fontSize: '13px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button onClick={volverACapitulos} style={{
          background: 'none', border: 'none', color: '#3b82f6', fontWeight: '600',
          cursor: 'pointer', padding: '0', fontSize: '13px',
        }}>← Capítulos</button>
        <span style={{ color: '#d1d5db' }}>›</span>
        <span style={{ color: '#22c55e', fontWeight: '600' }}>Cap. {capituloSel.codigo_capitulo}</span>
        {partidaSel && <>
          <span style={{ color: '#d1d5db' }}>›</span>
          <button onClick={volverAPartidas} style={{
            background: 'none', border: 'none', color: '#a855f7', fontWeight: '600',
            cursor: 'pointer', padding: '0', fontSize: '13px',
          }}>Partida {partidaSel.codigo_partida}</button>
        </>}
      </div>

      <div style={{ display: 'grid', gap: '16px',
        gridTemplateColumns: partidaSel ? '240px 1fr' : '1fr',
      }}>

        <div style={{ ...colBase, maxHeight: '560px' }}>
          {encabezado(NIVEL_COLORS.partida.bg,
            `📄 PARTIDAS — Cap. ${capituloSel.codigo_capitulo} (${partidas.length})`)}
          <div style={lista}>
            {cargandoParts ? vacio('Cargando partidas...') :
              partidas.map(p => (
                <TarjetaPartida key={p.codigo_partida} partida={p}
                  seleccionada={partidaSel} onClick={seleccionarPartida} />
              ))
            }
          </div>
        </div>

        {partidaSel && (
          <div style={{ ...colBase, maxHeight: '560px' }}>
            {encabezado(NIVEL_COLORS.subpartida.bg,
              `🔖 SUBPARTIDAS NACIONALES — Partida ${partidaSel.codigo_partida} (${subpartidas.length})`)}
            <div style={{ overflowY: 'auto', flexGrow: 1 }}>
              {cargandoSubs ? vacio('Cargando subpartidas...') : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e5e7eb', position: 'sticky', top: 0 }}>
                      {['CÓDIGO', 'DESCRIPCIÓN', 'GA %', 'UNIDAD', 'DOC. ADICIONAL', ''].map(h => (
                        <th key={h} style={{
                          padding: '10px 16px', textAlign: h === 'DESCRIPCIÓN' || h === '' ? 'left' : 'center',
                          fontSize: '11px', color: '#6b7280', fontWeight: '700',
                          letterSpacing: '0.5px', whiteSpace: 'nowrap',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {subpartidas.length === 0
                      ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#9ca3af' }}>Sin registros</td></tr>
                      : subpartidas.map((s, i) => <FilaSubpartida key={s.codigo_nacional} sub={s} index={i} />)
                    }
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {!partidaSel && !cargandoParts && partidas.length > 0 && (
        <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '13px', marginTop: '12px' }}>
          👆 Selecciona una partida para ver sus subpartidas nacionales
        </div>
      )}
    </div>
  );
}
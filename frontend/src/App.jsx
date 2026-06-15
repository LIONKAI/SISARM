import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Auth from './Auth';
import BuscadorArancel from './BuscadorArancel';
import ExploradorArancel from './ExploradorArancel';
import RestablecerPassword from './RestablecerPassword';
import Favoritos from './Favoritos';
import Historial from './Historial';
import AsistenteIA from './AsistenteIA';
import {
    guardarSesion, leerSesion, limpiarSesion,
    actualizarVistaSesion, tokenVigente, refrescarAccessToken,
} from './session';
import AvisoInactividad from './AvisoInactividad';
import useIdleTimeout from './useIdleTimeout';

// ══════════════════════════════════════════════════════════════════════
//  CONTENEDOR DE RUTAS
//  /                   → AppPrincipal (login + menú)
//  /restablecer/?token → RestablecerPassword (HU 1.2)
// ══════════════════════════════════════════════════════════════════════
export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/restablecer" element={<RestablecerPassword />} />
                <Route path="/*" element={<AppPrincipal />} />
            </Routes>
        </BrowserRouter>
    );
}

// ══════════════════════════════════════════════════════════════════════
//  APP PRINCIPAL — el flujo que ya tenías, sin cambios funcionales.
// ══════════════════════════════════════════════════════════════════════
function AppPrincipal() {
    const [usuario, setUsuario] = useState(null);
    const [menuAbierto, setMenuAbierto] = useState(true);
    const [vista, setVistaState] = useState('inicio');
    const [hidratando, setHidratando] = useState(true);

    // ── HU 6.1: Restaurar sesion al cargar (incluso tras F5) ──
    useEffect(() => {
        const sesion = leerSesion();
        if (!sesion) { setHidratando(false); return; }
        (async () => {
            if (tokenVigente(sesion.access)) {
                setUsuario({ access: sesion.access, refresh: sesion.refresh, username: sesion.username });
                if (sesion.vista) setVistaState(sesion.vista);
            } else {
                const nuevoAccess = await refrescarAccessToken();
                if (nuevoAccess) {
                    setUsuario({ access: nuevoAccess, refresh: sesion.refresh, username: sesion.username });
                    if (sesion.vista) setVistaState(sesion.vista);
                } else {
                    limpiarSesion();
                }
            }
            setHidratando(false);
        })();
    }, []);

    // Cada cambio de vista se persiste para sobrevivir a un recargo.
    const setVista = (nuevaVista) => {
        setVistaState(nuevaVista);
        actualizarVistaSesion(nuevaVista);
    };

    const handleLoginSuccess = (datosUsuario) => {
        guardarSesion({ ...datosUsuario, username: datosUsuario.username, vista: 'inicio' });
        setUsuario(datosUsuario);
        setVistaState('inicio');
    };

    const cerrarSesion = () => {
        limpiarSesion();
        setUsuario(null);
        setVistaState('inicio');
    };

    // ── HU 6.3: Auto-logout por inactividad ──
    const { mostrarAviso, segundosRestantes, mantenerActiva, forzarCierre } =
        useIdleTimeout({ activo: !!usuario, totalMs: 15 * 60 * 1000, avisoMs: 60 * 1000, onLogout: cerrarSesion });

    if (hidratando) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#f3f4f6', fontFamily: 'Arial, sans-serif', color: '#6b7280' }}>
                Restaurando sesion...
            </div>
        );
    }

    if (!usuario) {
        return <Auth onLoginSuccess={handleLoginSuccess} />;
    }

    const itemMenu = (nombre) => ({
        padding: '10px 14px',
        cursor: 'pointer',
        borderRadius: 'var(--radius-sm)',
        color: vista === nombre ? 'white' : 'var(--c-sidebar-text)',
        backgroundColor: vista === nombre ? 'var(--c-sidebar-active)' : 'transparent',
        transition: 'background-color var(--transition-fast), color var(--transition-fast)',
        fontSize: 'var(--fs-md)',
        fontWeight: vista === nombre ? 600 : 500,
        userSelect: 'none',
    });

    const itemMenuHover = (e) => {
        if (e.currentTarget.dataset.activo === 'true') return;
        e.currentTarget.style.backgroundColor = 'var(--c-sidebar-hover)';
        e.currentTarget.style.color = 'white';
    };
    const itemMenuLeave = (e) => {
        if (e.currentTarget.dataset.activo === 'true') return;
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.color = 'var(--c-sidebar-text)';
    };

    const navItem = (clave, etiqueta) => (
        <div
            style={itemMenu(clave)}
            data-activo={vista === clave}
            onMouseEnter={itemMenuHover}
            onMouseLeave={itemMenuLeave}
            onClick={() => setVista(clave)}
        >{etiqueta}</div>
    );

    return (
        <div style={{ display: 'flex', height: '100vh', fontFamily: 'var(--font-sans)', backgroundColor: 'var(--c-bg)', overflow: 'hidden' }}>

            {/* BARRA LATERAL */}
            {menuAbierto && (
                <div style={{
                    width: '260px', backgroundColor: 'var(--c-sidebar-bg)', color: 'white',
                    padding: 'var(--sp-5)', display: 'flex', flexDirection: 'column', flexShrink: 0,
                    boxShadow: 'var(--shadow-md)',
                }}>
                    <div style={{ marginBottom: 'var(--sp-8)' }}>
                        <h2 style={{ margin: 0, fontSize: 'var(--fs-2xl)', fontWeight: 700, color: 'white', letterSpacing: '-0.02em' }}>SISARM</h2>
                        <p style={{ margin: '4px 0 0 0', fontSize: 'var(--fs-xs)', color: 'var(--c-text-soft)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Clasificación Arancelaria
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)', flexGrow: 1 }}>
                        {navItem('inicio',     '🏠  Inicio')}
                        {navItem('buscador',   '🔍  Buscar Mercancía')}
                        {navItem('explorador', '🌳  Explorar Arancel')}
                        {navItem('favoritos',  '⭐  Mis Favoritos')}
                        {navItem('historial',  '📋  Historial')}
                        {navItem('asistente',  '⚡  Asistente IA')}
                    </div>

                    <button
                        onClick={cerrarSesion}
                        style={{
                            padding: '10px 14px', backgroundColor: 'transparent',
                            border: '1px solid rgba(255,255,255,0.15)', color: 'var(--c-sidebar-text)',
                            borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                            marginTop: 'var(--sp-5)', fontSize: 'var(--fs-sm)', fontWeight: 500,
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--c-danger)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'var(--c-danger)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--c-sidebar-text)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
                    >
                        Cerrar Sesión
                    </button>
                </div>
            )}

            {/* CONTENIDO PRINCIPAL */}
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

                {/* TOP BAR */}
                <div style={{
                    backgroundColor: 'var(--c-surface)', padding: '14px 28px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    borderBottom: '1px solid var(--c-border)', flexShrink: 0,
                }}>
                    <button
                        onClick={() => setMenuAbierto(!menuAbierto)}
                        style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--c-text-muted)', padding: 'var(--sp-1) var(--sp-2)', borderRadius: 'var(--radius-sm)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--c-border)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        aria-label="Alternar menú lateral"
                    >☰</button>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 600, fontSize: 'var(--fs-sm)', color: 'var(--c-text)' }}>{usuario.username || 'Despachante'}</div>
                        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--c-text-muted)' }}>Despachante autorizado</div>
                    </div>
                </div>

                {/* VISTAS */}
                <div className="fade-in" style={{ padding: 'var(--sp-8)', flexGrow: 1 }}>

                    {/* INICIO */}
                    {vista === 'inicio' && (
                        <>
                            <h1 style={{ margin: '0 0 6px 0', fontSize: 'var(--fs-2xl)', color: 'var(--c-text)', fontWeight: 700, letterSpacing: '-0.02em' }}>Bienvenido a SISARM</h1>
                            <p style={{ margin: '0 0 var(--sp-6) 0', color: 'var(--c-text-muted)', fontSize: 'var(--fs-md)' }}>Sistema de Clasificación Arancelaria y Gestión de Mercancías</p>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                                <div style={{ backgroundColor: '#eff6ff', padding: '20px', borderRadius: '8px', borderLeft: '5px solid #3b82f6' }}>
                                    <div style={{ color: '#6b7280', fontSize: '14px' }}>Búsquedas Realizadas</div>
                                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e3a8a', marginTop: '5px' }}>247</div>
                                </div>
                                <div style={{ backgroundColor: '#f0fdf4', padding: '20px', borderRadius: '8px', borderLeft: '5px solid #22c55e' }}>
                                    <div style={{ color: '#6b7280', fontSize: '14px' }}>Partidas Guardadas</div>
                                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#14532d', marginTop: '5px' }}>18</div>
                                </div>
                                <div style={{ backgroundColor: '#fffbeb', padding: '20px', borderRadius: '8px', borderLeft: '5px solid #f59e0b' }}>
                                    <div style={{ color: '#6b7280', fontSize: '14px' }}>Reportes Generados</div>
                                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#78350f', marginTop: '5px' }}>12</div>
                                </div>
                                <div style={{ backgroundColor: '#faf5ff', padding: '20px', borderRadius: '8px', borderLeft: '5px solid #a855f7' }}>
                                    <div style={{ color: '#6b7280', fontSize: '14px' }}>Consultas Legales</div>
                                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#581c87', marginTop: '5px' }}>5</div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                                <div onClick={() => setVista('buscador')} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', cursor: 'pointer', borderTop: '3px solid #3b82f6' }}>
                                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔍</div>
                                    <div style={{ fontWeight: '600', color: '#111827' }}>Buscar Mercancía</div>
                                    <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Búsqueda por texto o código</div>
                                </div>
                                <div onClick={() => setVista('explorador')} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', cursor: 'pointer', borderTop: '3px solid #22c55e' }}>
                                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>🌳</div>
                                    <div style={{ fontWeight: '600', color: '#111827' }}>Explorar Arancel</div>
                                    <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Navega por capítulos y partidas</div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* BUSCADOR */}
                    {vista === 'buscador' && (
                        <>
                            <h1 style={{ margin: '0 0 20px 0', fontSize: '24px', color: '#111827' }}>🔍 Buscar Mercancía</h1>
                            <BuscadorArancel token={usuario.access} />
                        </>
                    )}

                    {/* EXPLORADOR */}
                    {vista === 'explorador' && (
                        <>
                            <h1 style={{ margin: '0 0 6px 0', fontSize: '24px', color: '#111827' }}>🌳 Explorador Arancelario</h1>
                            <p style={{ margin: '0 0 20px 0', color: '#6b7280', fontSize: '14px' }}>Navega por la estructura jerárquica del Arancel Aduanero Boliviano</p>
                            <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                <ExploradorArancel />
                            </div>
                        </>
                    )}

                    {/* FAVORITOS — HU 5.2 (SIS-23) */}
                    {vista === 'favoritos' && (
                        <>
                            <h1 style={{ margin: '0 0 6px 0', fontSize: '24px', color: '#111827' }}>⭐ Mis Favoritos</h1>
                            <p style={{ margin: '0 0 20px 0', color: '#6b7280', fontSize: '14px' }}>
                                Partidas arancelarias que has guardado para acceso rápido.
                            </p>
                            <Favoritos token={usuario.access} />
                        </>
                    )}
{/* HISTORIAL — HU 5.3 (SIS-24) */}
                    {vista === 'historial' && (
                        <>
                            <h1 style={{ margin: '0 0 6px 0', fontSize: '24px', color: '#111827' }}>📋 Historial de Consultas</h1>
                            <p style={{ margin: '0 0 20px 0', color: '#6b7280', fontSize: '14px' }}>
                                Auditoría inmutable de todas tus consultas realizadas en SISARM.
                            </p>
                            <Historial token={usuario.access} />
                        </>
                    )}
                    {/* ASISTENTE IA — SIS-26 */}
                    {vista === 'asistente' && (
                        <AsistenteIA token={usuario.access} />
                    )}

                    {/* VISTAS EN CONSTRUCCIÓN */}
                    {['analizar', 'exportar'].includes(vista) && (
                        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--c-text-muted)' }}>
                            <div style={{ fontSize: '48px', marginBottom: 'var(--sp-4)' }}>🚧</div>
                            <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 600, color: 'var(--c-text)', marginBottom: 'var(--sp-2)' }}>Módulo en desarrollo</div>
                            <div style={{ fontSize: 'var(--fs-md)' }}>Esta funcionalidad estará disponible próximamente.</div>
                            <button
                                onClick={() => setVista('inicio')}
                                style={{
                                    marginTop: 'var(--sp-5)', padding: '10px 22px',
                                    backgroundColor: 'var(--c-primary)', color: 'white',
                                    border: 'none', borderRadius: 'var(--radius-sm)',
                                    fontSize: 'var(--fs-md)', fontWeight: 600,
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--c-primary-hover)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--c-primary)'; }}
                            >
                                Volver al inicio
                            </button>
                        </div>
                    )}

                </div>
            </div>

            {/* HU 6.3 — Aviso de cierre por inactividad */}
            {mostrarAviso && (
                <AvisoInactividad
                    segundos={segundosRestantes}
                    onContinuar={mantenerActiva}
                    onCerrar={forzarCierre}
                />
            )}
        </div>
    );
}
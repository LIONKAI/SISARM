import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Auth from './Auth';
import BuscadorArancel from './BuscadorArancel';
import ExploradorArancel from './ExploradorArancel';
import RestablecerPassword from './RestablecerPassword';
import Favoritos from './Favoritos';
import Historial from './Historial';

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
    const [vista, setVista] = useState('inicio');

    const handleLoginSuccess = (datosUsuario) => {
        setUsuario(datosUsuario);
    };

    if (!usuario) {
        return <Auth onLoginSuccess={handleLoginSuccess} />;
    }

    const itemMenu = (nombre) => ({
        padding: '10px 14px',
        cursor: 'pointer',
        borderRadius: '6px',
        color: vista === nombre ? 'white' : '#cbd5e1',
        backgroundColor: vista === nombre ? '#3b82f6' : 'transparent',
        transition: 'all 0.2s',
    });

    return (
        <div style={{ display: 'flex', height: '100vh', fontFamily: 'Arial, sans-serif', backgroundColor: '#f3f4f6', overflow: 'hidden' }}>

            {/* BARRA LATERAL */}
            {menuAbierto && (
                <div style={{ width: '260px', backgroundColor: '#1e293b', color: 'white', padding: '20px', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                    <h2 style={{ margin: '0 0 5px 0', fontSize: '24px', fontWeight: 'bold' }}>SISARM</h2>
                    <p style={{ margin: '0 0 30px 0', fontSize: '12px', color: '#94a3b8' }}>Sistema de Clasificación</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1 }}>
                        <div style={itemMenu('inicio')} onClick={() => setVista('inicio')}>🏠 Inicio</div>
                        <div style={itemMenu('buscador')} onClick={() => setVista('buscador')}>🔍 Buscar Mercancía</div>
                        <div style={itemMenu('explorador')} onClick={() => setVista('explorador')}>🌳 Explorar Arancel</div>
                        <div style={itemMenu('favoritos')} onClick={() => setVista('favoritos')}>⭐ Mis Favoritos</div>
                        <div style={itemMenu('historial')} onClick={() => setVista('historial')}>📋 Historial</div>
                        <div style={itemMenu('asistente')} onClick={() => setVista('asistente')}>⚡ Asistente IA</div>                        
                    </div>

                    <button onClick={() => setUsuario(null)} style={{ padding: '10px', backgroundColor: '#ef4444', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', marginTop: '20px' }}>
                        Cerrar Sesión
                    </button>
                </div>
            )}

            {/* CONTENIDO PRINCIPAL */}
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

                {/* TOP BAR */}
                <div style={{ backgroundColor: 'white', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
                    <button onClick={() => setMenuAbierto(!menuAbierto)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>☰</button>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{usuario.username || 'Despachante'}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>Usuario Autorizado</div>
                    </div>
                </div>

                {/* VISTAS */}
                <div style={{ padding: '30px', flexGrow: 1 }}>

                    {/* INICIO */}
                    {vista === 'inicio' && (
                        <>
                            <h1 style={{ margin: '0 0 5px 0', fontSize: '28px', color: '#111827' }}>Bienvenido a SISARM</h1>
                            <p style={{ margin: '0 0 25px 0', color: '#6b7280' }}>Sistema de Clasificación Arancelaria y Gestión de Mercancías</p>

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
                    {/* VISTAS EN CONSTRUCCIÓN */}
                    {['analizar', 'asistente', 'exportar'].includes(vista) && (
                        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#9ca3af' }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚧</div>
                            <div style={{ fontSize: '20px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Módulo en desarrollo</div>
                            <div style={{ fontSize: '14px' }}>Esta funcionalidad estará disponible próximamente.</div>
                            <button onClick={() => setVista('inicio')} style={{ marginTop: '20px', padding: '10px 24px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>
                                Volver al inicio
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
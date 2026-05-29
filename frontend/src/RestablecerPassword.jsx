import React, { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL;

// ──────────────────────────────────────────────────────────────────────
//  Reglas de validación de contraseña — HU 1.2 criterio 3
//  Idénticas a las del registro (Auth.jsx) para consistencia.
// ──────────────────────────────────────────────────────────────────────
function validarPassword(valor) {
    if (!valor) return 'La contraseña es obligatoria.';
    if (valor.length < 8) return 'Mínimo 8 caracteres.';
    if (!/[A-Za-z]/.test(valor)) return 'Debe incluir al menos una letra.';
    if (!/[0-9]/.test(valor)) return 'Debe incluir al menos un número.';
    if (!/[^A-Za-z0-9]/.test(valor)) return 'Debe incluir al menos un símbolo (ej. !, @, #, $).';
    return null;
}

// ══════════════════════════════════════════════════════════════════════
//  PANTALLA DE RESTABLECIMIENTO
//  Ruta: /restablecer/?token=XYZ
// ══════════════════════════════════════════════════════════════════════
export default function RestablecerPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmar, setConfirmar] = useState('');
    const [tocado, setTocado] = useState({ password: false, confirmar: false });
    const [errorServidor, setErrorServidor] = useState('');
    const [exito, setExito] = useState(false);
    const [enviando, setEnviando] = useState(false);

    const errores = useMemo(() => ({
        password: validarPassword(password),
        confirmar: !confirmar
            ? 'Debe confirmar la contraseña.'
            : confirmar !== password
                ? 'Las contraseñas no coinciden.'
                : null,
    }), [password, confirmar]);

    const formularioValido = !errores.password && !errores.confirmar;

    // Si la URL no trae token, mostramos un error desde el inicio.
    if (!token) {
        return (
            <PantallaMensaje
                tipo="error"
                titulo="Enlace inválido"
                texto="No se recibió un token de recuperación. Solicite un nuevo enlace desde la pantalla de ingreso."
                botonTexto="Volver al ingreso"
                onBoton={() => navigate('/')}
            />
        );
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorServidor('');
        setTocado({ password: true, confirmar: true });
        if (!formularioValido) return;

        setEnviando(true);
        try {
            await axios.post(`${API}/restablecer-password/`, {
                token,
                password,
            });
            setExito(true);
        } catch (err) {
            const msg = err.response?.data?.error || err.response?.data?.detail
                || 'No fue posible actualizar la contraseña. Intente nuevamente.';
            setErrorServidor(msg);
        } finally {
            setEnviando(false);
        }
    };

    if (exito) {
        return (
            <PantallaMensaje
                tipo="ok"
                titulo="¡Contraseña actualizada!"
                texto="Su nueva contraseña ha sido registrada correctamente. Ya puede ingresar al sistema con sus credenciales actualizadas."
                botonTexto="Ir al ingreso"
                onBoton={() => navigate('/')}
            />
        );
    }

    const estiloInput = (campo, valor) => {
        const mostrar = tocado[campo] && valor.length > 0;
        let borde = '#cbd5e1';
        if (mostrar) borde = errores[campo] ? '#dc2626' : '#16a34a';
        return {
            width: '100%', padding: '12px',
            border: `2px solid ${borde}`, borderRadius: '6px',
            boxSizing: 'border-box', outline: 'none', fontSize: '14px',
            letterSpacing: '2px',
        };
    };

    const MensajeCampo = ({ campo, valor }) => {
        if (!tocado[campo] || !valor) return null;
        const err = errores[campo];
        if (err) return <div style={est.mensajeError}><span aria-hidden>✕</span> {err}</div>;
        return <div style={est.mensajeOk}><span aria-hidden>✓</span> Formato válido.</div>;
    };

    const marcarTocado = (campo) => setTocado((t) => ({ ...t, [campo]: true }));

    return (
        <div style={est.fondo}>
            <div style={est.tarjeta}>
                <div style={est.header}>
                    <h1 style={est.titulo}>SISARM</h1>
                    <p style={est.subtitulo}>Definir nueva contraseña</p>
                </div>

                {errorServidor && <div style={est.alertaError} role="alert">{errorServidor}</div>}

                <form onSubmit={handleSubmit} noValidate>
                    <div style={est.grupo}>
                        <label style={est.etiqueta}>Nueva contraseña</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            style={estiloInput('password', password)}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onBlur={() => marcarTocado('password')}
                            autoComplete="new-password"
                        />
                        <MensajeCampo campo="password" valor={password} />
                        {!password && (
                            <div style={est.ayuda}>
                                Mínimo 8 caracteres, con letras, números y un símbolo.
                            </div>
                        )}
                    </div>

                    <div style={est.grupo}>
                        <label style={est.etiqueta}>Confirmar contraseña</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            style={estiloInput('confirmar', confirmar)}
                            value={confirmar}
                            onChange={(e) => setConfirmar(e.target.value)}
                            onBlur={() => marcarTocado('confirmar')}
                            autoComplete="new-password"
                        />
                        <MensajeCampo campo="confirmar" valor={confirmar} />
                    </div>

                    <button
                        type="submit"
                        disabled={!formularioValido || enviando}
                        style={{
                            ...est.boton,
                            backgroundColor: !formularioValido || enviando ? '#94a3b8' : '#1a365d',
                            cursor: !formularioValido || enviando ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {enviando ? 'Procesando…' : 'Actualizar contraseña'}
                    </button>
                </form>
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────
//  Pantalla auxiliar para mensajes de éxito/error con un solo botón.
// ──────────────────────────────────────────────────────────────────────
function PantallaMensaje({ tipo, titulo, texto, botonTexto, onBoton }) {
    const colorPrincipal = tipo === 'ok' ? '#16a34a' : '#dc2626';
    const fondoBanner = tipo === 'ok' ? '#f0fdf4' : '#fef2f2';
    const bordeBanner = tipo === 'ok' ? '#bbf7d0' : '#fecaca';

    return (
        <div style={est.fondo}>
            <div style={est.tarjeta}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        fontSize: '48px', marginBottom: '12px', color: colorPrincipal,
                    }}>
                        {tipo === 'ok' ? '✓' : '✕'}
                    </div>
                    <h2 style={{ margin: '0 0 12px 0', color: '#1a365d', fontSize: '22px' }}>{titulo}</h2>
                    <div style={{
                        backgroundColor: fondoBanner, border: `1px solid ${bordeBanner}`,
                        color: '#374151', padding: '14px', borderRadius: '6px',
                        fontSize: '14px', lineHeight: 1.5, marginBottom: '24px',
                    }}>
                        {texto}
                    </div>
                    <button
                        onClick={onBoton}
                        style={{
                            ...est.boton, backgroundColor: '#1a365d', cursor: 'pointer',
                        }}
                    >
                        {botonTexto}
                    </button>
                </div>
            </div>
        </div>
    );
}

const est = {
    fondo: {
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        minHeight: '100vh', backgroundColor: '#f0f4f8',
        fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        padding: '20px', boxSizing: 'border-box',
    },
    tarjeta: {
        backgroundColor: '#ffffff', padding: '40px', borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.08)', width: '420px', maxWidth: '100%',
    },
    header: { textAlign: 'center', marginBottom: '24px' },
    titulo: { color: '#1a365d', fontSize: '28px', fontWeight: 800, margin: '0 0 5px 0', letterSpacing: '1px' },
    subtitulo: { color: '#64748b', fontSize: '13px', margin: 0 },

    alertaError: {
        color: '#991b1b', backgroundColor: '#fef2f2', padding: '12px',
        borderRadius: '6px', textAlign: 'center', fontSize: '13px',
        marginBottom: '18px', border: '1px solid #fecaca',
    },

    grupo: { marginBottom: '18px' },
    etiqueta: {
        display: 'block', fontSize: '13px', fontWeight: 600,
        color: '#334155', marginBottom: '6px',
    },
    mensajeError: {
        color: '#dc2626', fontSize: '12px', marginTop: '5px',
        display: 'flex', alignItems: 'center', gap: '4px', lineHeight: 1.3,
    },
    mensajeOk: {
        color: '#16a34a', fontSize: '12px', marginTop: '5px',
        display: 'flex', alignItems: 'center', gap: '4px',
    },
    ayuda: { color: '#64748b', fontSize: '11px', marginTop: '5px', fontStyle: 'italic' },

    boton: {
        width: '100%', padding: '14px', color: 'white',
        border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '15px',
        transition: 'background-color 0.2s', marginTop: '8px',
    },
};
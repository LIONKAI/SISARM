import React, { useState, useMemo } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL;

// ══════════════════════════════════════════════════════════════════════
//  REGLAS DE VALIDACIÓN — HU 1.1 v2 (criterios 1, 5, 6, 7)
//  Y HU 1.2 (recuperación: validación de email en modo recuperar)
// ══════════════════════════════════════════════════════════════════════
const RE_USERNAME = /^[A-Za-z0-9_.-]+$/;

function validarUsuario(valor) {
    if (!valor) return 'El nombre de usuario es obligatorio.';
    if (/\s/.test(valor)) return 'No se permiten espacios en blanco.';
    if (valor.length < 3) return 'Mínimo 3 caracteres.';
    if (valor.length > 20) return 'Máximo 20 caracteres.';
    if (!RE_USERNAME.test(valor)) {
        const malo = [...valor].find(c => !/[A-Za-z0-9_.-]/.test(c));
        return `No se admite el carácter "${malo}". Sólo letras, números, "_", "." y "-".`;
    }
    return null;
}

function validarEmail(valor) {
    if (!valor) return 'El correo electrónico es obligatorio.';
    if (/\s/.test(valor)) return 'El correo no debe contener espacios.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)) {
        return 'Formato de correo no válido. Ejemplo: nombre@dominio.com';
    }
    return null;
}

function validarPassword(valor, esRegistro) {
    if (!valor) return 'La contraseña es obligatoria.';
    if (!esRegistro) return null;
    if (valor.length < 8) return 'Mínimo 8 caracteres.';
    if (!/[A-Za-z]/.test(valor)) return 'Debe incluir al menos una letra.';
    if (!/[0-9]/.test(valor)) return 'Debe incluir al menos un número.';
    if (!/[^A-Za-z0-9]/.test(valor)) return 'Debe incluir al menos un símbolo (ej. !, @, #, $).';
    return null;
}

// ══════════════════════════════════════════════════════════════════════
//  COMPONENTE PRINCIPAL — 3 modos
// ══════════════════════════════════════════════════════════════════════
export default function Auth({ onLoginSuccess }) {
    // 'login' | 'registro' | 'recuperar'
    const [modo, setModo] = useState('login');

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');

    const [errorServidor, setErrorServidor] = useState('');
    const [mensajeOk, setMensajeOk] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [tocado, setTocado] = useState({ username: false, email: false, password: false });

    const esLogin = modo === 'login';
    const esRegistro = modo === 'registro';
    const esRecuperar = modo === 'recuperar';

    // Validaciones reactivas — sólo evalúa los campos que el modo actual usa.
    const errores = useMemo(() => ({
        username: esRecuperar ? null : validarUsuario(username),
        email: esLogin ? null : validarEmail(email),
        password: esRecuperar ? null : validarPassword(password, esRegistro),
    }), [username, email, password, modo]);

    const formularioValido = !errores.username && !errores.email && !errores.password;

    const cambiarModo = (nuevo) => {
        setModo(nuevo);
        setErrorServidor('');
        setMensajeOk('');
        setTocado({ username: false, email: false, password: false });
        setPassword('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorServidor('');
        setMensajeOk('');
        setTocado({ username: true, email: true, password: true });
        if (!formularioValido) return;

        setEnviando(true);
        try {
            if (esLogin) {
                const res = await axios.post(`${API}/token/`, { username, password });
                onLoginSuccess(res.data);
            } else if (esRegistro) {
                await axios.post(`${API}/registro/`, { username, password, email });
                alert('¡Usuario registrado con éxito! Ahora puede ingresar al sistema.');
                cambiarModo('login');
            } else if (esRecuperar) {
                const res = await axios.post(`${API}/recuperar-password/`, { email });
                // El backend siempre responde con el mismo mensaje genérico
                // por seguridad (anti-enumeración de cuentas).
                setMensajeOk(res.data.message || 'Si el correo está registrado, recibirá un enlace de recuperación.');
                setEmail('');
                setTocado({ username: false, email: false, password: false });
            }
        } catch (err) {
            const mensajeBackend = err.response?.data?.error || err.response?.data?.detail;
            const esCredencialesInglesas =
                mensajeBackend && /no active account|invalid|credentials/i.test(mensajeBackend);
            if (esLogin) {
                setErrorServidor(esCredencialesInglesas || !mensajeBackend
                    ? 'Credenciales incorrectas. Verifique su usuario y contraseña.'
                    : mensajeBackend);
            } else {
                setErrorServidor(mensajeBackend || 'No fue posible procesar la solicitud. Intente nuevamente.');
            }
        } finally {
            setEnviando(false);
        }
    };

    const estiloInput = (campo, valor) => {
        const mostrar = tocado[campo] && valor.length > 0;
        let borde = '#cbd5e1';
        if (mostrar) borde = errores[campo] ? '#dc2626' : '#16a34a';
        return {
            width: '100%', padding: '12px',
            border: `2px solid ${borde}`, borderRadius: '6px',
            boxSizing: 'border-box', outline: 'none',
            transition: 'border-color 0.15s', fontSize: '14px',
        };
    };

    const MensajeCampo = ({ campo, valor }) => {
        if (!tocado[campo] || !valor) return null;
        const err = errores[campo];
        if (err) {
            return <div style={est.mensajeError}><span aria-hidden>✕</span> {err}</div>;
        }
        return <div style={est.mensajeOk}><span aria-hidden>✓</span> Formato válido.</div>;
    };

    const marcarTocado = (campo) => setTocado((t) => ({ ...t, [campo]: true }));

    const titulosBoton = {
        login: 'Ingresar al sistema',
        registro: 'Crear usuario',
        recuperar: 'Enviar enlace de recuperación',
    };

    return (
        <div style={est.fondo}>
            <div style={est.tarjeta}>
                <div style={est.header}>
                    <h1 style={est.titulo}>SISARM</h1>
                    <p style={est.subtitulo}>Sistema de Clasificación Arancelaria y Gestión de Mercancías</p>
                </div>

                {esRecuperar && (
                    <div style={est.infoRecuperar}>
                        Le enviaremos un enlace al correo registrado para que pueda definir una nueva contraseña. El enlace estará activo durante 60 minutos.
                    </div>
                )}

                {errorServidor && <div style={est.alertaError} role="alert">{errorServidor}</div>}
                {mensajeOk && <div style={est.alertaOk} role="status">{mensajeOk}</div>}

                <form onSubmit={handleSubmit} noValidate>
                    {(esRegistro || esRecuperar) && (
                        <div style={est.grupo}>
                            <label style={est.etiqueta}>Correo electrónico</label>
                            <input
                                type="text"
                                placeholder="ejemplo@agencia.com"
                                style={estiloInput('email', email)}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onBlur={() => marcarTocado('email')}
                                autoComplete="email"
                            />
                            <MensajeCampo campo="email" valor={email} />
                        </div>
                    )}

                    {!esRecuperar && (
                        <div style={est.grupo}>
                            <label style={est.etiqueta}>Nombre de usuario</label>
                            <input
                                type="text"
                                placeholder="Ingrese su usuario (sin espacios)"
                                style={estiloInput('username', username)}
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                onBlur={() => marcarTocado('username')}
                                autoComplete="username"
                                maxLength={20}
                            />
                            <MensajeCampo campo="username" valor={username} />
                        </div>
                    )}

                    {!esRecuperar && (
                        <div style={est.grupo}>
                            <label style={est.etiqueta}>Contraseña de acceso</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                style={{ ...estiloInput('password', password), letterSpacing: '2px' }}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onBlur={() => marcarTocado('password')}
                                autoComplete={esLogin ? 'current-password' : 'new-password'}
                            />
                            <MensajeCampo campo="password" valor={password} />
                            {esRegistro && !errores.password && !password && (
                                <div style={est.ayuda}>
                                    Mínimo 8 caracteres, con letras, números y un símbolo.
                                </div>
                            )}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={!formularioValido || enviando}
                        style={{
                            ...est.boton,
                            backgroundColor: !formularioValido || enviando ? '#94a3b8' : '#1a365d',
                            cursor: !formularioValido || enviando ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {enviando ? 'Procesando…' : titulosBoton[modo]}
                    </button>
                </form>

                <div style={est.enlacesPie}>
                    {esLogin && (
                        <>
                            <p style={est.enlace} onClick={() => cambiarModo('recuperar')}>
                                ¿Olvidó su contraseña?
                            </p>
                            <p style={est.enlace} onClick={() => cambiarModo('registro')}>
                                ¿No tiene cuenta? Regístrese
                            </p>
                        </>
                    )}
                    {esRegistro && (
                        <p style={est.enlace} onClick={() => cambiarModo('login')}>
                            ¿Ya tiene cuenta? Volver a ingresar
                        </p>
                    )}
                    {esRecuperar && (
                        <p style={est.enlace} onClick={() => cambiarModo('login')}>
                            ← Volver al ingreso
                        </p>
                    )}
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
    subtitulo: { color: '#64748b', fontSize: '13px', margin: 0, lineHeight: 1.4 },

    infoRecuperar: {
        backgroundColor: '#eff6ff', border: '1px solid #bfdbfe',
        color: '#1e40af', padding: '12px', borderRadius: '6px',
        fontSize: '13px', marginBottom: '18px', lineHeight: 1.5,
    },
    alertaError: {
        color: '#991b1b', backgroundColor: '#fef2f2', padding: '12px',
        borderRadius: '6px', textAlign: 'center', fontSize: '13px',
        marginBottom: '18px', border: '1px solid #fecaca',
    },
    alertaOk: {
        color: '#166534', backgroundColor: '#f0fdf4', padding: '12px',
        borderRadius: '6px', textAlign: 'center', fontSize: '13px',
        marginBottom: '18px', border: '1px solid #bbf7d0',
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

    enlacesPie: {
        textAlign: 'center', marginTop: '22px',
        display: 'flex', flexDirection: 'column', gap: '8px',
    },
    enlace: {
        fontSize: '13px', cursor: 'pointer', color: '#2563eb',
        fontWeight: 500, margin: 0, textDecoration: 'underline',
    },
};
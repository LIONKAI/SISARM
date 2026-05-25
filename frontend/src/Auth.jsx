import React, { useState } from 'react';
import axios from 'axios';

export default function Auth({ onLoginSuccess }) {
    const [esLogin, setEsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        try {
            if (esLogin) {
                // LOGICA DE LOGIN
                const res = await axios.post('http://127.0.0.1:8080/api/token/', { 
                    username: username, 
                    password: password 
                });
                onLoginSuccess(res.data);
            } else {
                // LOGICA DE REGISTRO
                await axios.post('http://127.0.0.1:8080/api/registro/', { 
                    username: username, 
                    password: password, 
                    email: email 
                });
                alert("¡Usuario registrado con éxito! Ahora puedes ingresar al sistema.");
                setEsLogin(true); // Regresa a la pantalla de login
                setPassword(''); // Limpia la contraseña por seguridad
            }
        } catch (err) {
            setError(err.response?.data?.error || err.response?.data?.detail || 'Ocurrió un error al procesar la solicitud.');
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f4f8', fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
            <div style={{ backgroundColor: '#ffffff', padding: '40px', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.05)', width: '400px' }}>
                
                {/* CABECERA */}
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <h1 style={{ color: '#1a365d', fontSize: '28px', fontWeight: '800', margin: '0 0 5px 0', letterSpacing: '1px' }}>SISARM</h1>
                    <p style={{ color: '#64748b', fontSize: '13px', margin: '0', padding: '0 20px', lineHeight: '1.4' }}>
                        Sistema de Clasificación Arancelaria y Gestión de Mercancías
                    </p>
                </div>
                
                {error && <div style={{ color: '#dc2626', backgroundColor: '#fef2f2', padding: '10px', borderRadius: '6px', textAlign: 'center', fontSize: '13px', marginBottom: '20px', border: '1px solid #fecaca' }}>{error}</div>}
                
                <form onSubmit={handleSubmit}>
                    {/* CAMPO DE CORREO (SOLO REGISTRO) */}
                    {!esLogin && (
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '8px', textAlign: 'center' }}>
                                Correo Electrónico
                            </label>
                            <input 
                                type="email" 
                                placeholder="ejemplo@agencia.com"
                                style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box', outline: 'none' }} 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                                required 
                            />
                        </div>
                    )}

                    {/* CAMPO DE USUARIO */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '8px', textAlign: 'center' }}>
                            Usuario
                        </label>
                        <input 
                            type="text" 
                            placeholder="Ingrese su usuario"
                            style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box', outline: 'none' }} 
                            value={username} 
                            onChange={(e) => setUsername(e.target.value)} 
                            required 
                        />
                    </div>
                    
                    {/* CAMPO DE CONTRASEÑA */}
                    <div style={{ marginBottom: '30px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '8px', textAlign: 'center' }}>
                            Contraseña de Acceso
                        </label>
                        <input 
                            type="password" 
                            placeholder="••••••••"
                            style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box', outline: 'none', letterSpacing: '2px' }} 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            required 
                        />
                    </div>
                    
                    {/* BOTÓN PRINCIPAL */}
                    <button type="submit" style={{ width: '100%', padding: '14px', backgroundColor: '#1a365d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '15px', transition: 'background-color 0.2s' }}>
                        {esLogin ? 'Ingresar al Sistema' : 'Crear Usuario'}
                    </button>
                </form>

                {/* TOGGLE LOGIN / REGISTRO */}
                <div style={{ textAlign: 'center', marginTop: '25px' }}>
                    <p 
                        style={{ fontSize: '13px', cursor: 'pointer', color: '#2563eb', fontWeight: '500', margin: 0, textDecoration: 'underline' }} 
                        onClick={() => {
                            setEsLogin(!esLogin);
                            setError('');
                        }}
                    >
                        {esLogin ? '¿No tiene cuenta? Regístrese' : '¿Ya tiene cuenta? Volver a Ingresar'}
                    </p>
                </div>

            </div>
        </div>
    );
}
import { useState } from 'react';
import axios from 'axios';

export default function Register({ irALogin }) {
  const [usuario, setUsuario] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const manejarRegistro = async (e) => {
    e.preventDefault();
    setError('');
    setExito('');

    if (password !== confirmarPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    try {
      await axios.post('http://127.0.0.1:8080/api/registro/', {
        username: usuario.trim(),
        password: password,
        email: correo
      });

      setExito('¡Cuenta creada exitosamente! Ya puedes iniciar sesión.');
      setTimeout(() => irALogin(), 2000);

    } catch (err) {
      const msg = err.response?.data?.error || 'Error al registrar. Intenta de nuevo.';
      setError(msg);
    }
  };

  const theme = {
    fondoPantalla: { minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f4f8', fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif', padding: '20px' },
    tarjeta: { backgroundColor: '#ffffff', padding: '40px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)', width: '100%', maxWidth: '420px', boxSizing: 'border-box' },
    encabezado: { textAlign: 'center', marginBottom: '30px' },
    tituloPrincipal: { color: '#1a365d', fontSize: '28px', fontWeight: '800', margin: '0 0 5px 0' },
    subtitulo: { color: '#64748b', fontSize: '14px', margin: '0' },
    grupoInput: { marginBottom: '15px' },
    label: { display: 'block', color: '#334155', fontSize: '13px', fontWeight: '600', marginBottom: '5px' },
    input: { width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none' },
    botonPrincipal: { width: '100%', padding: '12px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', marginTop: '10px' },
    mensajeError: { color: '#ef4444', fontSize: '13px', marginTop: '6px', fontWeight: '500' },
    mensajeExito: { color: '#16a34a', fontSize: '13px', marginTop: '6px', fontWeight: '500' },
    textoEnlace: { textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#64748b' },
    enlace: { color: '#1a365d', fontWeight: '600', cursor: 'pointer', textDecoration: 'none', background: 'none', border: 'none', padding: '0' }
  };

  return (
    <div style={theme.fondoPantalla}>
      <div style={theme.tarjeta}>
        <div style={theme.encabezado}>
          <h2 style={theme.tituloPrincipal}>Crear Cuenta</h2>
          <p style={theme.subtitulo}>Regístrate para acceder a SISARM</p>
        </div>

        <form onSubmit={manejarRegistro}>
          <div style={theme.grupoInput}>
            <label style={theme.label}>Nombre de Usuario</label>
            <input type="text" value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder="Elige un usuario" style={theme.input} required />
          </div>
          <div style={theme.grupoInput}>
            <label style={theme.label}>Correo Electrónico</label>
            <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="tu@correo.com" style={theme.input} required />
          </div>
          <div style={theme.grupoInput}>
            <label style={theme.label}>Contraseña</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={theme.input} required />
          </div>
          <div style={theme.grupoInput}>
            <label style={theme.label}>Confirmar Contraseña</label>
            <input type="password" value={confirmarPassword} onChange={(e) => setConfirmarPassword(e.target.value)} placeholder="••••••••" style={theme.input} required />
            {error && <div style={theme.mensajeError}>{error}</div>}
            {exito && <div style={theme.mensajeExito}>{exito}</div>}
          </div>

          <button type="submit" style={theme.botonPrincipal}>Registrarme</button>
        </form>

        <p style={theme.textoEnlace}>
          ¿Ya tienes cuenta? <button onClick={irALogin} style={theme.enlace}>Inicia sesión</button>
        </p>
      </div>
    </div>
  );
}
import { useState } from 'react';
import axios from 'axios';

// Recibimos una "función" como propiedad para poder cambiar de pantalla
export default function Login({ irARegistro }) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const manejarInicioSesion = async (e) => {
    e.preventDefault();
    setError('');

    const usuarioLimpio = usuario.trim();

    // Nueva Validación: Usuario alfanumérico entre 3 y 20 caracteres
    const regexUsuario = /^[a-zA-Z0-9_.-]{3,20}$/; 
    if (!regexUsuario.test(usuarioLimpio)) {
      setError('El usuario debe tener entre 3 y 20 caracteres y no contener espacios.');
      return;
    }

    try {
      const respuesta = await axios.post('http://127.0.0.1:8080/api/token/', {
        username: usuarioLimpio,
        password: password
      });

      localStorage.setItem('access_token', respuesta.data.access);
      alert('¡Acceso Autorizado! Bienvenido a SISARM.');

      setTimeout(() => {
        localStorage.removeItem('access_token');
        alert('Sesión bloqueada por seguridad tras 15 minutos de inactividad.');
        window.location.reload();
      }, 900000); 

    } catch (err) {
      setError('Credenciales incorrectas o usuario no registrado.');
    }
  };

  // --- ESTILOS ---
  const theme = {
    fondoPantalla: { minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f4f8', fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif' },
    tarjeta: { backgroundColor: '#ffffff', padding: '40px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)', width: '100%', maxWidth: '420px', boxSizing: 'border-box' },
    encabezado: { textAlign: 'center', marginBottom: '35px' },
    tituloPrincipal: { color: '#1a365d', fontSize: '32px', fontWeight: '800', margin: '0 0 10px 0', letterSpacing: '-0.5px' },
    subtitulo: { color: '#64748b', fontSize: '14px', margin: '0', lineHeight: '1.5' },
    grupoInput: { marginBottom: '20px' },
    label: { display: 'block', color: '#334155', fontSize: '14px', fontWeight: '600', marginBottom: '8px' },
    input: { width: '100%', padding: '12px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '15px', outline: 'none' },
    botonPrincipal: { width: '100%', padding: '14px', backgroundColor: '#1a365d', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', marginTop: '10px' },
    mensajeError: { color: '#ef4444', fontSize: '13px', marginTop: '6px', fontWeight: '500' },
    textoEnlace: { textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#64748b' },
    enlace: { color: '#2563eb', fontWeight: '600', cursor: 'pointer', textDecoration: 'none', background: 'none', border: 'none', padding: '0' }
  };

  return (
    <div style={theme.fondoPantalla}>
      <div style={theme.tarjeta}>
        
        <div style={theme.encabezado}>
          <h1 style={theme.tituloPrincipal}>SISARM</h1>
          <p style={theme.subtitulo}>Sistema de Clasificación Arancelaria y Gestión de Mercancías</p>
        </div>
        
        <form onSubmit={manejarInicioSesion}>
          <div style={theme.grupoInput}>
            <label style={theme.label}>Nombre de Usuario</label>
            <input 
              type="text" 
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="Ej: juanperez"
              style={theme.input}
            />
          </div>

          <div style={theme.grupoInput}>
            <label style={theme.label}>Contraseña</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={theme.input}
            />
            {error && <div style={theme.mensajeError}>{error}</div>}
          </div>

          <button type="submit" style={theme.botonPrincipal}>
            Ingresar al Sistema
          </button>
        </form>

        <p style={theme.textoEnlace}>
          ¿No tienes una cuenta? <button onClick={irARegistro} style={theme.enlace}>Regístrate aquí</button>
        </p>

      </div>
    </div>
  );
}
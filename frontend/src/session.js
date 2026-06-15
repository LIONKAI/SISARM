// =====================================================================
// SISARM - Gestion de sesion del despachante (HU 6.1, HU 6.3)
// =====================================================================
// Persiste el access token, refresh token, perfil del usuario y la
// vista activa en localStorage para que al recargar la pagina (F5,
// Ctrl+R, cierre y reapertura de pestana) el usuario no pierda su
// contexto. Tambien expone helpers para refrescar el access token
// cuando expira y para limpiar la sesion en el logout.
//
// Justificacion: HU 6.1 criterio 1 y 2 (persistencia de sesion).
// Referencia: OWASP Session Management Cheat Sheet, 2023.
// =====================================================================
import axios from 'axios';

const API = import.meta.env.VITE_API_URL;
const STORAGE_KEY = 'sisarm_session_v1';

export function guardarSesion(datosUsuario) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            access: datosUsuario.access,
            refresh: datosUsuario.refresh,
            username: datosUsuario.username || null,
            vista: datosUsuario.vista || 'inicio',
            guardadoEn: Date.now(),
        }));
    } catch (e) { /* localStorage podria estar deshabilitado */ }
}

export function leerSesion() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!data.access) return null;
        return data;
    } catch (e) { return null; }
}

export function actualizarVistaSesion(vista) {
    try {
        const actual = leerSesion();
        if (actual) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...actual, vista }));
        }
    } catch (e) { /* noop */ }
}

export function actualizarAccessToken(nuevoAccess) {
    try {
        const actual = leerSesion();
        if (actual) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                ...actual, access: nuevoAccess, guardadoEn: Date.now(),
            }));
        }
    } catch (e) { /* noop */ }
}

export function limpiarSesion() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* noop */ }
}

// Decodifica el payload de un JWT sin verificar firma.
// Util para saber si el token vencio sin pedirle nada al backend.
function decodificarJwt(token) {
    try {
        const partes = token.split('.');
        if (partes.length !== 3) return null;
        const payload = atob(partes[1].replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(payload);
    } catch (e) { return null; }
}

export function tokenVigente(access) {
    const payload = decodificarJwt(access);
    if (!payload || !payload.exp) return false;
    // Margen de 30 segundos para evitar usar token al filo de vencer.
    return payload.exp * 1000 > Date.now() + 30000;
}

// Intercambia el refresh token por un nuevo access token.
// Devuelve el nuevo access o null si falla.
export async function refrescarAccessToken() {
    const sesion = leerSesion();
    if (!sesion || !sesion.refresh) return null;
    try {
        const res = await axios.post(`${API}/token/refresh/`, { refresh: sesion.refresh });
        if (res.data?.access) {
            actualizarAccessToken(res.data.access);
            return res.data.access;
        }
    } catch (e) { /* refresh invalido o vencido */ }
    return null;
}

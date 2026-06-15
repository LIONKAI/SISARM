// =====================================================================
// SISARM - Hook useIdleTimeout (HU 6.3)
// Cierra la sesion automaticamente tras N minutos sin actividad del
// usuario y muestra un aviso al despachante T segundos antes.
//
// Justificacion: OWASP ASVS v4.0 §3.3 (idle timeout 5-15 min para apps
// de riesgo medio). Ley 1990 art. 38 (trazabilidad: ninguna accion
// debe quedar bajo una sesion abandonada y potencialmente usurpada).
// =====================================================================
import { useEffect, useRef, useState, useCallback } from 'react';

const EVENTOS_ACTIVIDAD = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'wheel', 'scroll'];

export default function useIdleTimeout({ activo, totalMs, avisoMs, onLogout }) {
    const [mostrarAviso, setMostrarAviso] = useState(false);
    const [segundosRestantes, setSegundosRestantes] = useState(Math.floor(avisoMs / 1000));
    const ultimaActividad = useRef(Date.now());
    const timerAviso = useRef(null);
    const timerLogout = useRef(null);
    const timerCuenta = useRef(null);

    const limpiarTimers = () => {
        if (timerAviso.current) clearTimeout(timerAviso.current);
        if (timerLogout.current) clearTimeout(timerLogout.current);
        if (timerCuenta.current) clearInterval(timerCuenta.current);
        timerAviso.current = null;
        timerLogout.current = null;
        timerCuenta.current = null;
    };

    const armar = useCallback(() => {
        limpiarTimers();
        if (!activo) return;
        ultimaActividad.current = Date.now();
        setMostrarAviso(false);
        setSegundosRestantes(Math.floor(avisoMs / 1000));

        timerAviso.current = setTimeout(() => {
            setMostrarAviso(true);
            let restantes = Math.floor(avisoMs / 1000);
            setSegundosRestantes(restantes);
            timerCuenta.current = setInterval(() => {
                restantes -= 1;
                if (restantes <= 0) {
                    clearInterval(timerCuenta.current);
                    timerCuenta.current = null;
                } else {
                    setSegundosRestantes(restantes);
                }
            }, 1000);
        }, totalMs - avisoMs);

        timerLogout.current = setTimeout(() => {
            setMostrarAviso(false);
            onLogout?.();
        }, totalMs);
    }, [activo, totalMs, avisoMs, onLogout]);

    const onActividad = useCallback(() => {
        // Si el aviso ya esta visible, ignorar actividad: forzamos al
        // usuario a decidir explicitamente con el modal.
        if (mostrarAviso) return;
        const ahora = Date.now();
        if (ahora - ultimaActividad.current > 1000) {
            armar();
        }
    }, [armar, mostrarAviso]);

    const mantenerActiva = useCallback(() => {
        armar();
    }, [armar]);

    const forzarCierre = useCallback(() => {
        limpiarTimers();
        setMostrarAviso(false);
        onLogout?.();
    }, [onLogout]);

    useEffect(() => {
        if (!activo) { limpiarTimers(); setMostrarAviso(false); return; }
        armar();
        EVENTOS_ACTIVIDAD.forEach(ev => window.addEventListener(ev, onActividad, { passive: true }));
        return () => {
            limpiarTimers();
            EVENTOS_ACTIVIDAD.forEach(ev => window.removeEventListener(ev, onActividad));
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activo]);

    return { mostrarAviso, segundosRestantes, mantenerActiva, forzarCierre };
}

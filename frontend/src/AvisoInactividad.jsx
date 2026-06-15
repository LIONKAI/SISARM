// =====================================================================
// SISARM - Modal de aviso de inactividad (HU 6.3, criterio 2)
// Aparece 60 segundos antes del cierre automatico de sesion.
// =====================================================================
import React from 'react';

export default function AvisoInactividad({ segundos, onContinuar, onCerrar }) {
    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="aviso-inactividad-titulo"
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.55)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 9999, fontFamily: 'Arial, sans-serif',
            }}
        >
            <div style={{
                backgroundColor: 'white', borderRadius: '12px',
                padding: '28px 32px', maxWidth: '440px', width: '90%',
                boxShadow: '0 20px 50px rgba(0,0,0,0.25)', textAlign: 'center',
            }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>⏱️</div>
                <h2 id="aviso-inactividad-titulo" style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#111827' }}>
                    Sesión por expirar
                </h2>
                <p style={{ margin: '0 0 16px 0', color: '#4b5563', fontSize: '14px', lineHeight: '1.5' }}>
                    Por seguridad, cerraremos su sesión automáticamente
                    si no detectamos actividad. ¿Desea continuar trabajando?
                </p>
                <div style={{
                    fontSize: '36px', fontWeight: 'bold',
                    color: segundos <= 15 ? '#dc2626' : '#1f4e79',
                    marginBottom: '20px', fontVariantNumeric: 'tabular-nums',
                }}>
                    {String(Math.floor(segundos / 60)).padStart(2, '0')}:{String(segundos % 60).padStart(2, '0')}
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <button
                        onClick={onCerrar}
                        style={{
                            padding: '10px 18px', fontSize: '14px',
                            backgroundColor: '#f3f4f6', color: '#374151',
                            border: '1px solid #d1d5db', borderRadius: '6px',
                            cursor: 'pointer', fontWeight: '500',
                        }}
                    >
                        Cerrar ahora
                    </button>
                    <button
                        onClick={onContinuar}
                        autoFocus
                        style={{
                            padding: '10px 22px', fontSize: '14px', fontWeight: '600',
                            backgroundColor: '#1f4e79', color: 'white',
                            border: 'none', borderRadius: '6px', cursor: 'pointer',
                        }}
                    >
                        Continuar sesión
                    </button>
                </div>
            </div>
        </div>
    );
}

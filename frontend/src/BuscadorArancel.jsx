import React, { useState } from 'react';
import axios from 'axios';

export default function BuscadorArancel() {
    // 1. Estados para controlar el texto escrito y los resultados devueltos por Django
    const [textoDeLaBarra, setTextoDeLaBarra] = useState('');
    const [resultados, setResultados] = useState([]);
    const [cargando, setCargando] = useState(false);

    // 2. FUNCIÓN DE BÚSQUEDA (Aquí es donde va tu código)
    const realizarBusqueda = async (valorABuscar) => {
        if (!valorABuscar.trim()) {
            setResultados([]);
            return;
        }

        setCargando(true);
        try {
            // ---> TU CÓDIGO ADAPTADO AQUÍ <---
            const respuesta = await axios.get(`http://127.0.0.1:8080/api/buscar/?q=${valorABuscar}`);
            setResultados(respuesta.data); // Guarda la lista que envió Django en el estado
        } catch (error) {
            console.error("Error al conectar con el motor de búsqueda:", error);
        } finally {
            setCargando(false);
        }
    };

    // 3. Manejador del cambio de la barra de texto
    const handleInputChange = (e) => {
        const valor = e.target.value;
        setTextoDeLaBarra(valor);
        realizarBusqueda(valor); // Busca en tiempo real mientras el despachante escribe
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial' }}>
            <h2>Buscador del Arancel Aduanero Boliviano</h2>
            
            {/* Barra de entrada de texto */}
            <input
                type="text"
                placeholder="Busca por código, glosa, SENASAG, GA, etc..."
                value={textoDeLaBarra}
                onChange={handleInputChange}
                style={{ width: '100%', padding: '10px', fontSize: '16px', marginBottom: '20px' }}
            />

            {cargando && <p>Buscando en la base de datos de aduanas...</p>}

            {/* Tabla Dinámica para mostrar los resultados obtenidos instantáneamente */}
            <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ backgroundColor: '#f2f2f2' }}>
                        <th>Código Nacional</th>
                        <th>Descripción de la Mercancía</th>
                        <th>GA %</th>
                        <th>Unidad</th>
                        <th>Documento Adicional</th>
                    </tr>
                </thead>
                <tbody>
                    {resultados.map((item) => (
                        <tr key={item.codigo_nacional}>
                            <td style={{ fontWeight: 'bold' }}>{item.codigo_nacional}</td>
                            <td>{item.descripcion_mercancia}</td>
                            <td align="center">{item.ga_porcentaje}%</td>
                            <td align="center">{item.unidad_medida}</td>
                            <td style={{ color: '#d32f2f', fontSize: '12px' }}>{item.documento_adicional || 'Ninguno'}</td>
                        </tr>
                    ))}
                    {!cargando && resultados.length === 0 && textoDeLaBarra && (
                        <tr>
                            <td colSpan="5" align="center">No se encontraron mercancías por ese criterio.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
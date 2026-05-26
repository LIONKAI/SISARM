import React, { useState } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL;

export default function BuscadorArancel() {
    const [textoDeLaBarra, setTextoDeLaBarra] = useState('');
    const [resultados, setResultados] = useState([]);
    const [cargando, setCargando] = useState(false);

    const realizarBusqueda = async (valorABuscar) => {
        if (!valorABuscar.trim()) {
            setResultados([]);
            return;
        }
        setCargando(true);
        try {
            const respuesta = await axios.get(`${API}/buscar-nomenclatura/?q=${valorABuscar}`);
            setResultados(respuesta.data.resultados);
        } catch (error) {
            console.error("Error al conectar con el motor de búsqueda:", error);
        } finally {
            setCargando(false);
        }
    };

    const handleInputChange = (e) => {
        const valor = e.target.value;
        setTextoDeLaBarra(valor);
        realizarBusqueda(valor);
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial' }}>
            <h2>Buscador del Arancel Aduanero Boliviano</h2>

            <input
                type="text"
                placeholder="Busque por texto"
                value={textoDeLaBarra}
                onChange={handleInputChange}
                style={{ width: '100%', padding: '10px', fontSize: '16px', marginBottom: '20px' }}
            />

            {cargando && <p>Buscando en la base de datos de aduanas...</p>}

            <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ backgroundColor: '#f2f2f2' }}>
                        <th>Código Nacional</th>
                        <th>Descripción de la Mercancía</th>
                        <th>GA %</th>
                        <th>Unidad</th>
                        <th>Documento Adicional</th>
                        <th>Ruta</th>
                    </tr>
                </thead>
                <tbody>
                    {resultados.map((item) => (
                        <tr key={item.codigo_oficial}>
                            <td style={{ fontWeight: 'bold' }}>{item.codigo_oficial}</td>
                            <td>{item.descripcion}</td>
                            <td align="center">{item.ga_porcentaje}%</td>
                            <td align="center">{item.unidad_medida}</td>
                            <td style={{ color: '#d32f2f', fontSize: '12px' }}>{item.doc_adicional || 'Ninguno'}</td>
                            <td style={{ fontSize: '11px', color: '#9ca3af' }}>{item.ruta}</td>
                        </tr>
                    ))}
                    {!cargando && resultados.length === 0 && textoDeLaBarra && (
                        <tr>
                            <td colSpan="6" align="center">No se encontraron mercancías por ese criterio.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

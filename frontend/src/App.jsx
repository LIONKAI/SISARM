import { useState } from 'react';
import Login from './Login';
import Register from './Register';

function App() {
  // Guardamos en memoria qué pantalla está viendo el usuario (por defecto 'login')
  const [vistaActual, setVistaActual] = useState('login');

  return (
    <div>
      {/* Si la vista es login, muestra Login. Si no, muestra Register */}
      {vistaActual === 'login' ? (
        <Login irARegistro={() => setVistaActual('registro')} />
      ) : (
        <Register irALogin={() => setVistaActual('login')} />
      )}
    </div>
  );
}

export default App;

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

const init = () => {
  try {
    const rootElement = document.getElementById('root');
    if (!rootElement) return;

    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    
    console.log("React montado correctamente.");
  } catch (error) {
    console.error("Error al arrancar React:", error);
    const errDisplay = document.getElementById('error-message');
    if (errDisplay) errDisplay.textContent = String(error);
    const overlay = document.getElementById('error-display');
    if (overlay) overlay.style.display = 'block';
    const loader = document.getElementById('loading-screen');
    if (loader) loader.style.display = 'none';
  }
};

init();

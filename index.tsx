
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Quitar pantalla de carga cuando React esté listo
setTimeout(() => {
  const loader = document.getElementById('loading-screen');
  if (loader) loader.style.opacity = '0';
  setTimeout(() => loader?.remove(), 500);
}, 500);

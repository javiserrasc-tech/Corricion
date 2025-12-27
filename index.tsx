
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

console.log("Iniciando montaje de React...");

const container = document.getElementById('root');
if (container) {
  try {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("Montaje exitoso.");
  } catch (err) {
    console.error("Error durante el renderizado:", err);
    // Fix: Accessing custom window property showFatalError by casting window to any to resolve TypeScript errors
    if ((window as any).showFatalError) {
      (window as any).showFatalError(err instanceof Error ? err.message : String(err));
    }
  }
} else {
  console.error("No se encontró el elemento #root");
}

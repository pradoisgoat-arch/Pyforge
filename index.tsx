
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

console.log("ParadoV2: Initializing React 19 Root...");

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log("ParadoV2: Render sequence initiated.");
} else {
  console.error("ParadoV2: Root container not found!");
}

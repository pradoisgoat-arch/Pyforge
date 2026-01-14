
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log("ParadoV2: index.tsx loaded. Attempting to mount React root...");

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("ParadoV2: Could not find root element to mount to");
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log("ParadoV2: React.render called.");
} catch (e) {
  console.error("ParadoV2: Mounting failed!", e);
}

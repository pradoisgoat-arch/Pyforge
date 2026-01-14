
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

console.log("ParadoV2: Initializing React 19 Root...");

// Service Worker Registration for PWA - Resilient Logic
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    let swUrl = './sw.js';
    try {
      // In some sandboxed environments, window.location.href might be 'about:srcdoc' or similar,
      // which causes the URL constructor to throw.
      if (window.location.href && window.location.href.startsWith('http')) {
        swUrl = new URL('./sw.js', window.location.href).href;
      }
    } catch (e) {
      console.warn('ParadoV2: Could not construct absolute SW URL, falling back to relative path.');
    }
    
    navigator.serviceWorker.register(swUrl)
      .then(reg => {
        console.log('ParadoV2: Service Worker Registered at scope:', reg.scope);
      })
      .catch(err => {
        if (err.name === 'SecurityError') {
          console.warn('ParadoV2: PWA Service Worker is restricted in this sandboxed environment.');
        } else {
          console.error('ParadoV2: Service Worker registration failed:', err);
        }
      });
  });
}

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

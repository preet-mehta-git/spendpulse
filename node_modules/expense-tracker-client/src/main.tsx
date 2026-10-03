import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register PWA Service Worker with auto-update
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('A new update is available. Reload to update?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('SpendPulse PWA ready for offline usage.');
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

//by Rejiro Reobaldez
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import "./styles/global.css";

import { registerSW } from 'virtual:pwa-register';
import { AuthProvider } from './context/AuthContext';
import { initPWAInstallListener } from './services/pwaService';

// Automatically update the service worker when new content is detected
registerSW({ 
  immediate: true,
  onRegistered() {
    console.log('CA1B Connect PWA: Service Worker Registered');
    // Initialize PWA install listener
    initPWAInstallListener();
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
//by Rejiro Reobaldez
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import "./styles/global.css";

import { registerSW } from 'virtual:pwa-register';
import { AuthProvider } from './context/AuthContext';

// Automatically update the service worker when new content is detected
registerSW({ 
  immediate: true,
  onRegistered() {
    console.log('CA1B Connect PWA: Service Worker Registered');
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
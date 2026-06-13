//by Rejiro Reobaldez
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import "./styles/global.css";

import { registerSW } from 'virtual:pwa-register';
import { AuthProvider } from './context/AuthContext';

registerSW();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
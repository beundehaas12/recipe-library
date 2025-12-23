// DEBUG: Log hash immediately when JS first executes
console.log('[main.jsx] Initial hash:', window.location.hash);
console.log('[main.jsx] Full URL:', window.location.href);

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './context/AuthContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)

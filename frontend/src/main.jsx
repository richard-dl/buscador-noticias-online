import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import 'react-toastify/dist/ReactToastify.css'
import './styles/global.css'
import './styles/subscription.css'

// PWA Install Debug - capturar evento lo más temprano posible
window.__pwaInstallEvent = null
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('[PWA Main] beforeinstallprompt capturado en main.jsx!')
  window.__pwaInstallEvent = e
})

// Función de debug accesible desde consola
window.checkPWA = async () => {
  console.log('=== PWA Debug Info ===')
  console.log('beforeinstallprompt event:', window.__pwaInstallEvent ? 'CAPTURADO' : 'NO DISPONIBLE')
  console.log('Service Worker:', 'serviceWorker' in navigator ? 'Soportado' : 'No soportado')

  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations()
    console.log('SW Registrations:', regs.length)
    regs.forEach((reg, i) => {
      console.log(`  SW ${i}:`, reg.scope, reg.active ? 'ACTIVO' : 'inactivo')
    })
  }

  // Verificar manifest
  const manifestLink = document.querySelector('link[rel="manifest"]')
  console.log('Manifest link:', manifestLink ? manifestLink.href : 'NO ENCONTRADO')

  // Verificar display mode
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  console.log('Display mode standalone:', isStandalone)

  // Info del navegador
  console.log('User Agent:', navigator.userAgent)
  console.log('======================')

  return {
    installEvent: !!window.__pwaInstallEvent,
    swSupported: 'serviceWorker' in navigator,
    standalone: isStandalone
  }
}

console.log('[PWA] Para debug, ejecuta: checkPWA()')

// Registrar Service Worker para PWA
registerSW({
  onNeedRefresh() {
    if (confirm('Hay una nueva versión disponible. ¿Actualizar?')) {
      window.location.reload()
    }
  },
  onOfflineReady() {
    console.log('App lista para uso offline')
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <ToastContainer
          position="top-right"
          autoClose={4000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)

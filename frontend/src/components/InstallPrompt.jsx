import { useState, useEffect } from 'react'
import './InstallPrompt.css'

// Variable global para capturar el evento antes de que React se monte
let deferredPromptGlobal = null

// Capturar el evento inmediatamente cuando se carga el script
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('[PWA] beforeinstallprompt capturado globalmente')
    e.preventDefault()
    deferredPromptGlobal = e
  })
}

function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [debugInfo, setDebugInfo] = useState('')

  useEffect(() => {
    // Debug info
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
    const isAndroid = /Android/.test(navigator.userAgent)
    const isChrome = /Chrome/.test(navigator.userAgent) && !/Edge|Edg/.test(navigator.userAgent)

    console.log('[PWA Debug] iOS:', isIOSDevice)
    console.log('[PWA Debug] Android:', isAndroid)
    console.log('[PWA Debug] Chrome:', isChrome)
    console.log('[PWA Debug] Standalone:', isInStandaloneMode)
    console.log('[PWA Debug] deferredPromptGlobal:', deferredPromptGlobal ? 'EXISTE' : 'NULL')
    console.log('[PWA Debug] User Agent:', navigator.userAgent)

    setIsIOS(isIOSDevice)

    // Si ya está instalada, no mostrar nada
    if (isInStandaloneMode) {
      console.log('[PWA] App ya instalada, no mostrando banner')
      return
    }

    // Si ya capturamos el evento globalmente, usarlo
    if (deferredPromptGlobal) {
      console.log('[PWA] Usando evento capturado globalmente')
      setDeferredPrompt(deferredPromptGlobal)
      const installPromptDismissed = localStorage.getItem('installPromptDismissed')
      if (!installPromptDismissed) {
        setShowInstallBanner(true)
      }
      return
    }

    // Para iOS, mostrar instrucciones manuales
    if (isIOSDevice) {
      const iosPromptDismissed = localStorage.getItem('iosInstallPromptDismissed')
      if (!iosPromptDismissed) {
        setShowInstallBanner(true)
      }
      return
    }

    // Para Android/Chrome - escuchar beforeinstallprompt
    const handleBeforeInstallPrompt = (e) => {
      console.log('[PWA] beforeinstallprompt disparado!')
      e.preventDefault()
      setDeferredPrompt(e)
      deferredPromptGlobal = e
      const installPromptDismissed = localStorage.getItem('installPromptDismissed')
      if (!installPromptDismissed) {
        setShowInstallBanner(true)
      }
    }

    const handleAppInstalled = () => {
      console.log('[PWA] App instalada!')
      setDeferredPrompt(null)
      deferredPromptGlobal = null
      setShowInstallBanner(false)
      localStorage.setItem('appInstalled', 'true')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // Verificar criterios de instalación después de un tiempo
    setTimeout(() => {
      if (!deferredPromptGlobal) {
        console.log('[PWA] Después de 5s, beforeinstallprompt NO se disparó')
        console.log('[PWA] Posibles razones:')
        console.log('  - La app ya está instalada')
        console.log('  - El manifest tiene errores')
        console.log('  - No hay suficiente engagement (30s)')
        console.log('  - Problema con Service Worker')
      }
    }, 5000)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    // Mostrar el prompt de instalación
    deferredPrompt.prompt()

    // Esperar la respuesta del usuario
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('Usuario aceptó instalar la PWA')
    } else {
      console.log('Usuario rechazó instalar la PWA')
    }

    // Limpiar el prompt guardado
    setDeferredPrompt(null)
    setShowInstallBanner(false)
  }

  const handleDismiss = () => {
    setShowInstallBanner(false)
    if (isIOS) {
      localStorage.setItem('iosInstallPromptDismissed', 'true')
    } else {
      localStorage.setItem('installPromptDismissed', 'true')
    }
  }

  if (!showInstallBanner) return null

  return (
    <div className="install-prompt-banner">
      <div className="install-prompt-content">
        <div className="install-prompt-icon">
          <img src="/icon-192x192.png" alt="App icon" width="48" height="48" />
        </div>
        <div className="install-prompt-text">
          <strong>Instalar Buscador de Noticias</strong>
          {isIOS ? (
            <p>
              Toca <span className="ios-share-icon">⎙</span> y luego "Agregar a inicio"
            </p>
          ) : (
            <p>Instala la app para acceso rápido y uso offline</p>
          )}
        </div>
        <div className="install-prompt-actions">
          {!isIOS && (
            <button className="install-btn" onClick={handleInstallClick}>
              Instalar
            </button>
          )}
          <button className="dismiss-btn" onClick={handleDismiss}>
            {isIOS ? 'Entendido' : 'Ahora no'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default InstallPrompt

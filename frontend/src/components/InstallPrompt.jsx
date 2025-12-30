import { useState, useEffect } from 'react'
import './InstallPrompt.css'

function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Detectar iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone

    setIsIOS(isIOSDevice)

    // Si ya está instalada, no mostrar nada
    if (isInStandaloneMode) {
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
      // Prevenir que Chrome muestre el mini-infobar automático
      e.preventDefault()
      // Guardar el evento para usarlo después
      setDeferredPrompt(e)
      // Verificar si el usuario ya descartó el banner antes
      const installPromptDismissed = localStorage.getItem('installPromptDismissed')
      if (!installPromptDismissed) {
        setShowInstallBanner(true)
      }
    }

    const handleAppInstalled = () => {
      // Limpiar cuando se instala la app
      setDeferredPrompt(null)
      setShowInstallBanner(false)
      localStorage.setItem('appInstalled', 'true')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

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

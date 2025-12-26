import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { sessionsApi } from '../services/api'
import { getSessionId } from '../services/deviceService'
import Header from '../components/Header'
import LoadingSpinner from '../components/LoadingSpinner'
import { toast } from 'react-toastify'
import {
  FiMonitor, FiSmartphone, FiTablet, FiClock, FiMapPin,
  FiTrash2, FiLogOut, FiSettings, FiShield, FiRefreshCw
} from 'react-icons/fi'
import '../styles/sessions.css'

const Sessions = () => {
  const { profile } = useAuth()
  const [sessions, setSessions] = useState([])
  const [settings, setSettings] = useState({ maxSessions: 3, singleSessionMode: false })
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const currentSessionId = getSessionId()

  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    try {
      setLoading(true)
      const response = await sessionsApi.getAll()
      if (response.success) {
        setSessions(response.data.sessions || [])
        setSettings(response.data.settings || { maxSessions: 3, singleSessionMode: false })
      }
    } catch (error) {
      console.error('Error cargando sesiones:', error)
      toast.error('Error al cargar sesiones')
    } finally {
      setLoading(false)
    }
  }

  const handleRevokeSession = async (sessionId) => {
    if (sessionId === currentSessionId) {
      if (!window.confirm('Esta es tu sesión actual. Se cerrará tu sesión. ¿Continuar?')) {
        return
      }
    }

    try {
      setActionLoading(sessionId)
      await sessionsApi.revoke(sessionId)
      toast.success('Sesión cerrada')

      if (sessionId === currentSessionId) {
        window.location.href = '/login'
      } else {
        loadSessions()
      }
    } catch (error) {
      console.error('Error cerrando sesión:', error)
      toast.error('Error al cerrar sesión')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRevokeAll = async () => {
    const otherSessions = sessions.filter(s => s.id !== currentSessionId)
    if (otherSessions.length === 0) {
      toast.info('No hay otras sesiones activas')
      return
    }

    if (!window.confirm(`¿Cerrar ${otherSessions.length} sesión(es) en otros dispositivos?`)) {
      return
    }

    try {
      setActionLoading('all')
      const response = await sessionsApi.revokeAll()
      toast.success(response.message || 'Sesiones cerradas')
      loadSessions()
    } catch (error) {
      console.error('Error cerrando sesiones:', error)
      toast.error('Error al cerrar sesiones')
    } finally {
      setActionLoading(null)
    }
  }

  const handleToggleSingleSession = async () => {
    try {
      setActionLoading('settings')
      const newValue = !settings.singleSessionMode
      await sessionsApi.updateSettings({ singleSessionMode: newValue })
      setSettings(prev => ({ ...prev, singleSessionMode: newValue }))
      toast.success(newValue
        ? 'Modo sesión única activado'
        : 'Modo sesión única desactivado'
      )
    } catch (error) {
      console.error('Error actualizando configuración:', error)
      toast.error('Error al actualizar configuración')
    } finally {
      setActionLoading(null)
    }
  }

  const getDeviceIcon = (deviceType) => {
    switch (deviceType) {
      case 'mobile': return <FiSmartphone size={24} />
      case 'tablet': return <FiTablet size={24} />
      default: return <FiMonitor size={24} />
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Desconocido'
    return new Date(dateString).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getRelativeTime = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Ahora mismo'
    if (diffMins < 60) return `Hace ${diffMins} min`
    if (diffHours < 24) return `Hace ${diffHours}h`
    return `Hace ${diffDays}d`
  }

  if (loading) {
    return (
      <div className="sessions-page">
        <Header />
        <main className="sessions-main container">
          <LoadingSpinner size="large" text="Cargando sesiones..." />
        </main>
      </div>
    )
  }

  return (
    <div className="sessions-page">
      <Header />

      <main className="sessions-main container">
        <div className="sessions-header">
          <h1>
            <FiShield size={28} />
            Sesiones Activas
          </h1>
          <p className="sessions-subtitle">
            Administra los dispositivos donde has iniciado sesión
          </p>
        </div>

        {/* Configuración */}
        <section className="sessions-card">
          <div className="card-header">
            <h2>
              <FiSettings size={20} />
              Configuración de Seguridad
            </h2>
          </div>

          <div className="settings-content">
            <div className="setting-item">
              <div className="setting-info">
                <span className="setting-label">Modo sesión única</span>
                <span className="setting-description">
                  Al activar, cada nuevo inicio de sesión cerrará las sesiones anteriores automáticamente
                </span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.singleSessionMode}
                  onChange={handleToggleSingleSession}
                  disabled={actionLoading === 'settings'}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <span className="setting-label">Dispositivos máximos</span>
                <span className="setting-description">
                  Puedes tener hasta {settings.maxSessions} dispositivos activos simultáneamente
                </span>
              </div>
              <span className="setting-value">{sessions.length} / {settings.maxSessions}</span>
            </div>
          </div>
        </section>

        {/* Lista de sesiones */}
        <section className="sessions-card">
          <div className="card-header sessions-list-header">
            <h2>Dispositivos conectados ({sessions.length})</h2>
            <div className="header-actions">
              <button
                className="btn btn-ghost"
                onClick={loadSessions}
                disabled={loading}
                title="Actualizar lista"
              >
                <FiRefreshCw size={18} />
              </button>
              {sessions.length > 1 && (
                <button
                  className="btn btn-outline-danger"
                  onClick={handleRevokeAll}
                  disabled={actionLoading === 'all'}
                >
                  {actionLoading === 'all' ? (
                    <LoadingSpinner size="small" />
                  ) : (
                    <>
                      <FiLogOut size={16} />
                      Cerrar otras
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {sessions.length === 0 ? (
            <p className="empty-message">No hay sesiones activas</p>
          ) : (
            <div className="sessions-grid">
              {sessions.map(session => (
                <div
                  key={session.id}
                  className={`session-card ${session.isCurrent ? 'session-current' : ''}`}
                >
                  <div className="session-icon">
                    {getDeviceIcon(session.deviceInfo?.deviceType)}
                  </div>

                  <div className="session-info">
                    <div className="session-device">
                      <span className="device-name">
                        {session.deviceInfo?.browser || 'Navegador desconocido'}
                        {' en '}
                        {session.deviceInfo?.os || 'Sistema desconocido'}
                      </span>
                      {session.isCurrent && (
                        <span className="badge badge-success">Este dispositivo</span>
                      )}
                    </div>

                    <div className="session-meta">
                      <span className="meta-item">
                        <FiMapPin size={14} />
                        {session.ipInfo?.city || 'Ubicación desconocida'}
                        {session.ipInfo?.country && session.ipInfo.country !== 'Desconocido' && `, ${session.ipInfo.country}`}
                      </span>
                      <span className="meta-item">
                        <FiClock size={14} />
                        {getRelativeTime(session.lastActivity)}
                      </span>
                    </div>

                    <div className="session-dates">
                      <span>Inicio: {formatDate(session.createdAt)}</span>
                    </div>
                  </div>

                  <button
                    className="btn btn-icon btn-danger-ghost"
                    onClick={() => handleRevokeSession(session.id)}
                    disabled={actionLoading === session.id}
                    title={session.isCurrent ? 'Cerrar esta sesión (te desconectará)' : 'Cerrar sesión'}
                  >
                    {actionLoading === session.id ? (
                      <LoadingSpinner size="small" />
                    ) : (
                      <FiTrash2 size={18} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Información adicional */}
        <section className="sessions-card sessions-info">
          <h3>Información de seguridad</h3>
          <ul>
            <li>Las sesiones expiran automáticamente después de 30 días de inactividad</li>
            <li>Si no reconoces algún dispositivo, cierra esa sesión inmediatamente</li>
            <li>Considera activar el modo sesión única para mayor seguridad</li>
            <li>Cambia tu contraseña si detectas actividad sospechosa</li>
          </ul>
        </section>
      </main>
    </div>
  )
}

export default Sessions

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { vipApi } from '../services/api'
import { toast } from 'react-toastify'
import { FiStar, FiLock, FiClock, FiTrash2, FiImage, FiAlertTriangle } from 'react-icons/fi'
import LoadingSpinner from '../components/LoadingSpinner'
import '../styles/zonavip.css'

const ZonaVip = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [vipStatus, setVipStatus] = useState(null)
  const [content, setContent] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingContent, setLoadingContent] = useState(false)

  useEffect(() => {
    checkVipAccess()
  }, [])

  const checkVipAccess = async () => {
    try {
      setLoading(true)
      const response = await vipApi.getStatus()
      setVipStatus(response.data)

      if (response.data.hasAccess) {
        loadVipContent()
      }
    } catch (error) {
      console.error('Error verificando acceso VIP:', error)
      setVipStatus({ hasAccess: false, reason: error.message })
    } finally {
      setLoading(false)
    }
  }

  const loadVipContent = async () => {
    try {
      setLoadingContent(true)
      const response = await vipApi.getContent(50)
      setContent(response.data || [])
    } catch (error) {
      console.error('Error cargando contenido VIP:', error)
      toast.error('Error al cargar contenido VIP')
    } finally {
      setLoadingContent(false)
    }
  }

  const handleDeleteContent = async (contentId) => {
    if (!window.confirm('¿Eliminar este contenido?')) return

    try {
      await vipApi.deleteContent(contentId)
      setContent(prev => prev.filter(c => c.id !== contentId))
      toast.success('Contenido eliminado')
    } catch (error) {
      toast.error(error.message || 'Error al eliminar contenido')
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp._seconds
      ? new Date(timestamp._seconds * 1000)
      : new Date(timestamp)
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="zona-vip-container">
        <LoadingSpinner message="Verificando acceso VIP..." />
      </div>
    )
  }

  // Sin acceso VIP - mostrar página de bloqueo
  if (!vipStatus?.hasAccess) {
    return (
      <div className="zona-vip-container">
        <div className="vip-locked">
          <div className="vip-locked-icon">
            <FiLock size={64} />
          </div>
          <h1>Zona VIP</h1>
          <p className="vip-locked-message">
            {vipStatus?.reason || 'Esta sección requiere una suscripción VIP activa.'}
          </p>
          {vipStatus?.expiredAt && (
            <p className="vip-expired-date">
              Tu suscripción VIP expiró el {formatDate(vipStatus.expiredAt)}
            </p>
          )}
          <div className="vip-benefits">
            <h3>Beneficios de la Zona VIP:</h3>
            <ul>
              <li><FiStar /> Acceso exclusivo a información privilegiada</li>
              <li><FiStar /> Noticias antes que nadie</li>
              <li><FiStar /> Contenido de fuentes verificadas</li>
              <li><FiStar /> Alertas de última hora</li>
            </ul>
          </div>
          <button className="btn-upgrade-vip" onClick={() => navigate('/profile')}>
            Obtener Suscripción VIP
          </button>
        </div>
      </div>
    )
  }

  // Con acceso VIP - mostrar contenido
  return (
    <div className="zona-vip-container">
      <div className="vip-header">
        <div className="vip-header-title">
          <FiStar className="vip-star" />
          <h1>Zona VIP</h1>
          <FiStar className="vip-star" />
        </div>
        <p className="vip-subtitle">Contenido exclusivo para suscriptores VIP</p>
        {vipStatus.daysRemaining && (
          <div className="vip-status-badge">
            <FiClock />
            <span>{vipStatus.daysRemaining} días restantes de VIP</span>
          </div>
        )}
      </div>

      {loadingContent ? (
        <LoadingSpinner message="Cargando contenido exclusivo..." />
      ) : content.length === 0 ? (
        <div className="vip-empty">
          <FiImage size={48} />
          <p>No hay contenido VIP disponible en este momento.</p>
          <p className="vip-empty-hint">El contenido nuevo aparecerá aquí automáticamente.</p>
        </div>
      ) : (
        <div className="vip-content-grid">
          {content.map((item) => (
            <div key={item.id} className="vip-content-card">
              {item.imagen && (
                <div className="vip-content-image">
                  <img
                    src={`https://api.telegram.org/file/bot${import.meta.env.VITE_TELEGRAM_BOT_TOKEN}/${item.imagen.fileId}`}
                    alt={item.titulo}
                    onError={(e) => e.target.style.display = 'none'}
                  />
                </div>
              )}
              <div className="vip-content-body">
                {item.titulo && (
                  <h3 className="vip-content-title">{item.titulo}</h3>
                )}
                {item.fuente && (
                  <span className="vip-content-source">Fuente: {item.fuente}</span>
                )}
                <div className="vip-content-text">
                  {item.contenido}
                </div>
                {item.sensible && item.sensible.length > 0 && (
                  <div className="vip-content-sensitive">
                    <FiAlertTriangle />
                    <span>Contiene {item.sensible.length} dato(s) sensible(s) protegido(s)</span>
                  </div>
                )}
                <div className="vip-content-footer">
                  <span className="vip-content-date">{formatDate(item.createdAt)}</span>
                  {user?.role === 'admin' && (
                    <button
                      className="btn-delete-vip"
                      onClick={() => handleDeleteContent(item.id)}
                      title="Eliminar contenido"
                    >
                      <FiTrash2 />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="btn-refresh-vip" onClick={loadVipContent}>
        Actualizar contenido
      </button>
    </div>
  )
}

export default ZonaVip

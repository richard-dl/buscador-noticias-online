import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { vipApi, userApi } from '../services/api'
import { toast } from 'react-toastify'
import { FiStar, FiLock, FiClock, FiTrash2, FiImage, FiAlertTriangle, FiRefreshCw, FiCopy, FiBookmark, FiFilter, FiCalendar } from 'react-icons/fi'
import Header from '../components/Header'
import LoadingSpinner from '../components/LoadingSpinner'
import '../styles/zonavip.css'

const ZonaVip = () => {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [vipStatus, setVipStatus] = useState(null)
  const [content, setContent] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingContent, setLoadingContent] = useState(false)
  const [sortBy, setSortBy] = useState('fecha') // 'fecha' o 'fuente'
  const [sortOrder, setSortOrder] = useState('desc') // 'asc' o 'desc'

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

  const handleCopyContent = (item) => {
    const textToCopy = `${item.titulo ? item.titulo + '\n\n' : ''}${item.contenido}${item.fuente ? '\n\nFuente: ' + item.fuente : ''}`
    navigator.clipboard.writeText(textToCopy)
    toast.success('Contenido copiado al portapapeles')
  }

  const handleSaveNews = async (item) => {
    try {
      await userApi.saveNews({
        title: item.titulo || 'Contenido VIP',
        description: item.contenido,
        source: item.fuente || 'Zona VIP',
        url: '',
        pubDate: item.createdAt
      })
      toast.success('Noticia guardada')
    } catch (error) {
      toast.error(error.message || 'Error al guardar noticia')
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

  const formatExpirationDate = (timestamp) => {
    if (!timestamp) return null
    const date = timestamp._seconds
      ? new Date(timestamp._seconds * 1000)
      : new Date(timestamp)
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const getTimestamp = (item) => {
    if (!item.createdAt) return 0
    return item.createdAt._seconds
      ? item.createdAt._seconds * 1000
      : new Date(item.createdAt).getTime()
  }

  // Ordenar contenido
  const sortedContent = useMemo(() => {
    const sorted = [...content]

    if (sortBy === 'fecha') {
      sorted.sort((a, b) => {
        const timeA = getTimestamp(a)
        const timeB = getTimestamp(b)
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB
      })
    } else if (sortBy === 'fuente') {
      sorted.sort((a, b) => {
        const fuenteA = (a.fuente || '').toLowerCase()
        const fuenteB = (b.fuente || '').toLowerCase()
        if (sortOrder === 'asc') {
          return fuenteA.localeCompare(fuenteB)
        }
        return fuenteB.localeCompare(fuenteA)
      })
    }

    return sorted
  }, [content, sortBy, sortOrder])

  // Obtener lista única de fuentes para el filtro
  const uniqueSources = useMemo(() => {
    const sources = content.map(item => item.fuente).filter(Boolean)
    return [...new Set(sources)]
  }, [content])

  if (loading) {
    return (
      <div className="zona-vip-page">
        <Header />
        <div className="zona-vip-container">
          <LoadingSpinner message="Verificando acceso VIP..." />
        </div>
      </div>
    )
  }

  // Sin acceso VIP - mostrar página de bloqueo
  if (!vipStatus?.hasAccess) {
    return (
      <div className="zona-vip-page">
        <Header />
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
      </div>
    )
  }

  // Con acceso VIP - mostrar contenido
  return (
    <div className="zona-vip-page">
      <Header />
      <div className="zona-vip-container">
        {/* Barra superior con vencimiento */}
        {vipStatus.expiresAt && (
          <div className="vip-expiration-bar">
            <FiClock />
            <span>
              Tu suscripción VIP vence el <strong>{formatExpirationDate(vipStatus.expiresAt)}</strong>
              {vipStatus.daysRemaining && ` (${vipStatus.daysRemaining} días restantes)`}
            </span>
          </div>
        )}

        <div className="vip-header">
          <div className="vip-header-title">
            <FiStar className="vip-star" />
            <h1>Zona VIP</h1>
            <FiStar className="vip-star" />
          </div>
          <p className="vip-subtitle">Contenido exclusivo para suscriptores VIP</p>

          {/* Botón actualizar centrado arriba */}
          <button
            className="btn-refresh-top"
            onClick={loadVipContent}
            disabled={loadingContent}
          >
            <FiRefreshCw className={loadingContent ? 'spinning' : ''} />
            <span>{loadingContent ? 'Actualizando...' : 'Actualizar contenido'}</span>
          </button>
        </div>

        {/* Filtros */}
        {content.length > 0 && (
          <div className="vip-filters">
            <div className="vip-filter-group">
              <FiFilter />
              <span className="filter-label">Ordenar por:</span>
              <button
                className={`filter-btn ${sortBy === 'fecha' ? 'active' : ''}`}
                onClick={() => setSortBy('fecha')}
              >
                <FiCalendar /> Fecha
              </button>
              <button
                className={`filter-btn ${sortBy === 'fuente' ? 'active' : ''}`}
                onClick={() => setSortBy('fuente')}
              >
                Fuente
              </button>
            </div>
            <div className="vip-filter-group">
              <span className="filter-label">Orden:</span>
              <button
                className={`filter-btn ${sortOrder === 'desc' ? 'active' : ''}`}
                onClick={() => setSortOrder('desc')}
              >
                Más reciente
              </button>
              <button
                className={`filter-btn ${sortOrder === 'asc' ? 'active' : ''}`}
                onClick={() => setSortOrder('asc')}
              >
                Más antiguo
              </button>
            </div>
            <span className="vip-content-count">{content.length} elementos</span>
          </div>
        )}

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
            {sortedContent.map((item) => (
              <div key={item.id} className="vip-content-card">
                {item.imagen && (
                  <div className="vip-content-image">
                    {item.imagen.type === 'video' ? (
                      <video
                        controls
                        preload="auto"
                        crossOrigin="anonymous"
                        playsInline
                        src={vipApi.getMediaUrl(item.imagen.fileId)}
                        onError={(e) => {
                          console.error('Error cargando video:', item.imagen.fileId, e)
                          e.target.parentElement.innerHTML = '<p class="media-error">Error al cargar video</p>'
                        }}
                      />
                    ) : (
                      <img
                        src={vipApi.getMediaUrl(item.imagen.fileId)}
                        alt={item.titulo || 'Imagen VIP'}
                        onError={(e) => {
                          console.error('Error cargando imagen:', item.imagen.fileId)
                          e.target.parentElement.innerHTML = '<p class="media-error">Error al cargar imagen</p>'
                        }}
                      />
                    )}
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
                    <div className="vip-content-actions">
                      <button
                        className="btn-action-vip"
                        onClick={() => handleCopyContent(item)}
                        title="Copiar contenido"
                      >
                        <FiCopy />
                      </button>
                      <button
                        className="btn-action-vip btn-save"
                        onClick={() => handleSaveNews(item)}
                        title="Guardar noticia"
                      >
                        <FiBookmark />
                      </button>
                      {(profile?.role === 'admin') && (
                        <button
                          className="btn-action-vip btn-delete"
                          onClick={() => handleDeleteContent(item.id)}
                          title="Eliminar contenido"
                        >
                          <FiTrash2 />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ZonaVip

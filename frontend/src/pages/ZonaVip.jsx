import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { vipApi, userApi } from '../services/api'
import { toast } from 'react-toastify'
import { FiStar, FiLock, FiClock, FiTrash2, FiImage, FiAlertTriangle, FiRefreshCw, FiCopy, FiBookmark, FiFilter, FiCalendar, FiChevronLeft, FiChevronRight, FiChevronDown, FiChevronUp, FiLayers } from 'react-icons/fi'
import Header from '../components/Header'
import LoadingSpinner from '../components/LoadingSpinner'
import '../styles/zonavip.css'

const ITEMS_PER_PAGE = 12

const ZonaVip = () => {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [vipStatus, setVipStatus] = useState(null)
  const [content, setContent] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingContent, setLoadingContent] = useState(false)
  const [sortBy, setSortBy] = useState('fecha') // 'fecha' o 'fuente'
  const [sortOrder, setSortOrder] = useState('desc') // 'asc' o 'desc'
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedTexts, setExpandedTexts] = useState({}) // Para manejar textos expandidos
  const [expandedGroups, setExpandedGroups] = useState({}) // Para expandir/colapsar grupos
  const [viewMode, setViewMode] = useState('grouped') // 'grouped' o 'flat'
  const [savedItems, setSavedItems] = useState({}) // Para rastrear items guardados
  const [failedVideos, setFailedVideos] = useState({}) // Para rastrear videos que fallaron al cargar

  const handleVideoError = (itemId) => {
    setFailedVideos(prev => ({ ...prev, [itemId]: true }))
  }

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
        loadSavedItems()
      }
    } catch (error) {
      console.error('Error verificando acceso VIP:', error)
      setVipStatus({ hasAccess: false, reason: error.message })
    } finally {
      setLoading(false)
    }
  }

  const loadSavedItems = async () => {
    try {
      const response = await userApi.getSavedNews()
      const saved = {}
      // Marcar items VIP guardados (tienen link vip://id)
      ;(response.data || []).forEach(news => {
        if (news.link && news.link.startsWith('vip://')) {
          const vipId = news.link.replace('vip://', '')
          saved[vipId] = true
        }
      })
      setSavedItems(saved)
    } catch (error) {
      console.error('Error cargando items guardados:', error)
    }
  }

  const loadVipContent = async () => {
    try {
      setLoadingContent(true)
      const response = await vipApi.getContent(100)
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
    if (savedItems[item.id]) {
      toast.info('Este contenido ya está guardado')
      return
    }

    try {
      await userApi.saveNews({
        title: item.titulo || 'Contenido VIP',
        link: `vip://${item.id}`, // Link interno para contenido VIP
        description: item.contenido,
        source: item.fuente || 'Zona VIP',
        pubDate: item.createdAt,
        image: item.imagen ? vipApi.getMediaUrl(item.imagen.fileId) : '',
        category: item.imagen?.type === 'video' ? 'video' : ''
      })
      setSavedItems(prev => ({ ...prev, [item.id]: true }))
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

  // Agrupar contenido por groupId
  const groupedContent = useMemo(() => {
    if (viewMode === 'flat') {
      // Modo plano: cada item es su propio "grupo"
      return sortedContent.map(item => ({
        groupId: item.id,
        items: [item],
        mainItem: item,
        createdAt: item.createdAt
      }))
    }

    // Modo agrupado: agrupar por groupId
    const groups = new Map()

    sortedContent.forEach(item => {
      const gid = item.groupId || item.id // Si no tiene groupId, usa su propio id

      if (!groups.has(gid)) {
        groups.set(gid, {
          groupId: gid,
          items: [],
          mainItem: null,
          createdAt: null
        })
      }

      const group = groups.get(gid)
      group.items.push(item)

      // El mainItem es el primero (más antiguo) del grupo, o el que tiene título
      if (!group.mainItem || (item.titulo && !group.mainItem.titulo)) {
        group.mainItem = item
      }

      // La fecha del grupo es la del item más reciente
      const itemTime = getTimestamp(item)
      const groupTime = group.createdAt ? getTimestamp({ createdAt: group.createdAt }) : 0
      if (itemTime > groupTime) {
        group.createdAt = item.createdAt
      }
    })

    // Convertir a array y ordenar grupos
    const groupArray = Array.from(groups.values())

    // Ordenar items dentro de cada grupo por fecha (más antiguo primero)
    groupArray.forEach(group => {
      group.items.sort((a, b) => getTimestamp(a) - getTimestamp(b))
      // Recalcular mainItem como el primer item del grupo
      if (group.items.length > 0) {
        group.mainItem = group.items[0]
      }
    })

    return groupArray
  }, [sortedContent, viewMode])

  // Contar grupos con múltiples items (siempre basado en content original, no en viewMode)
  const groupsWithMultipleItems = useMemo(() => {
    const groups = new Map()
    content.forEach(item => {
      const gid = item.groupId || item.id
      if (!groups.has(gid)) {
        groups.set(gid, 0)
      }
      groups.set(gid, groups.get(gid) + 1)
    })
    return Array.from(groups.values()).filter(count => count > 1).length
  }, [content])

  const toggleGroupExpand = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }))
  }

  // Paginación (ahora sobre grupos)
  const totalPages = Math.ceil(groupedContent.length / ITEMS_PER_PAGE)
  const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    const end = start + ITEMS_PER_PAGE
    return groupedContent.slice(start, end)
  }, [groupedContent, currentPage])

  // Reset página cuando cambia el orden
  useEffect(() => {
    setCurrentPage(1)
  }, [sortBy, sortOrder])

  const toggleExpandText = (itemId) => {
    setExpandedTexts(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }))
  }

  const truncateText = (text, maxLength = 200) => {
    if (!text || text.length <= maxLength) return { text, isTruncated: false }
    return { text: text.substring(0, maxLength) + '...', isTruncated: true }
  }

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
            <span className="vip-content-count">
              {viewMode === 'grouped' && groupsWithMultipleItems > 0
                ? `${groupedContent.length} grupos (${content.length} elementos)`
                : `${content.length} elementos`
              }
            </span>
            {groupsWithMultipleItems > 0 && (
              <div className="view-mode-buttons">
                <button
                  className={`filter-btn view-mode-btn ${viewMode === 'grouped' ? 'active' : ''}`}
                  onClick={() => { setViewMode('grouped'); setCurrentPage(1); }}
                  title="Ver contenido agrupado"
                  disabled={viewMode === 'grouped'}
                >
                  <FiLayers />
                  <span>Agrupar</span>
                </button>
                <button
                  className={`filter-btn view-mode-btn ${viewMode === 'flat' ? 'active' : ''}`}
                  onClick={() => { setViewMode('flat'); setCurrentPage(1); }}
                  title="Ver todos separados"
                  disabled={viewMode === 'flat'}
                >
                  <FiLayers />
                  <span>Desagrupar</span>
                </button>
              </div>
            )}
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
          <>
          <div className="vip-content-grid">
            {paginatedGroups.map((group) => {
              const isGroupExpanded = expandedGroups[group.groupId]
              const hasMultipleItems = group.items.length > 1

              // Función para renderizar una tarjeta individual
              const renderCard = (item, isSecondary = false) => {
                const { text: displayText, isTruncated } = truncateText(item.contenido)
                const isTextExpanded = expandedTexts[item.id]

                return (
                  <div
                    key={item.id}
                    className={`vip-content-card ${isSecondary ? 'vip-card-secondary' : ''}`}
                  >
                    {item.imagen && (
                      <div className="vip-content-image">
                        {item.imagen.type === 'video' ? (
                          // Si tiene embedUrl (video grande reenviado al canal público), usar iframe
                          item.imagen.embedUrl ? (
                            <iframe
                              src={item.imagen.embedUrl}
                              className="telegram-embed"
                              style={{ border: 'none', overflow: 'hidden' }}
                              allowFullScreen
                            />
                          ) : failedVideos[item.id] ? (
                            // Video falló al cargar y no tiene embed
                            <p className="media-error">Video no disponible</p>
                          ) : (
                            // Video normal (<20MB), usar reproductor directo
                            <video
                              controls
                              preload="auto"
                              crossOrigin="anonymous"
                              playsInline
                              src={vipApi.getMediaUrl(item.imagen.fileId)}
                              onError={() => handleVideoError(item.id)}
                            />
                          )
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
                      {item.contenido && (
                        <>
                          <div className="vip-content-text">
                            {isTextExpanded ? item.contenido : displayText}
                          </div>
                          {isTruncated && (
                            <button
                              className="btn-expand-text"
                              onClick={() => toggleExpandText(item.id)}
                            >
                              {isTextExpanded ? (
                                <>
                                  <FiChevronUp size={14} />
                                  <span>Ver menos</span>
                                </>
                              ) : (
                                <>
                                  <FiChevronDown size={14} />
                                  <span>Ver todo</span>
                                </>
                              )}
                            </button>
                          )}
                        </>
                      )}
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
                            className={`btn-action-vip btn-save ${savedItems[item.id] ? 'saved' : ''}`}
                            onClick={() => handleSaveNews(item)}
                            title={savedItems[item.id] ? 'Guardado' : 'Guardar noticia'}
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
                )
              }

              // Si es un grupo con múltiples items
              if (hasMultipleItems) {
                return (
                  <div key={group.groupId} className="vip-content-group">
                    <div className="vip-group-header">
                      <button
                        className="btn-group-toggle"
                        onClick={() => toggleGroupExpand(group.groupId)}
                      >
                        <FiLayers />
                        <span>{group.items.length} elementos relacionados</span>
                        {isGroupExpanded ? <FiChevronUp /> : <FiChevronDown />}
                      </button>
                    </div>

                    {/* Mostrar primer item siempre */}
                    {renderCard(group.items[0], false)}

                    {/* Mostrar resto de items si está expandido */}
                    {isGroupExpanded && (
                      <div className="vip-group-items">
                        {group.items.slice(1).map(item => renderCard(item, true))}
                      </div>
                    )}

                    {/* Miniaturas de los demás items cuando está colapsado */}
                    {!isGroupExpanded && group.items.length > 1 && (
                      <div className="vip-group-thumbnails">
                        {group.items.slice(1, 4).map(item => (
                          <div
                            key={item.id}
                            className="vip-thumbnail"
                            onClick={() => toggleGroupExpand(group.groupId)}
                          >
                            {item.imagen ? (
                              item.imagen.type === 'video' ? (
                                <div className="thumbnail-video">▶</div>
                              ) : (
                                <img
                                  src={vipApi.getMediaUrl(item.imagen.fileId)}
                                  alt=""
                                />
                              )
                            ) : (
                              <div className="thumbnail-text">
                                {item.contenido?.substring(0, 30)}...
                              </div>
                            )}
                          </div>
                        ))}
                        {group.items.length > 4 && (
                          <div
                            className="vip-thumbnail vip-thumbnail-more"
                            onClick={() => toggleGroupExpand(group.groupId)}
                          >
                            +{group.items.length - 4}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              }

              // Item individual (sin grupo)
              return renderCard(group.mainItem, false)
            })}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="vip-pagination">
              <button
                className="btn-page"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <FiChevronLeft />
                <span>Anterior</span>
              </button>

              <div className="page-numbers">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => {
                    // Mostrar primera, última, actual y adyacentes
                    if (page === 1 || page === totalPages) return true
                    if (Math.abs(page - currentPage) <= 1) return true
                    return false
                  })
                  .map((page, idx, arr) => (
                    <span key={page}>
                      {idx > 0 && arr[idx - 1] !== page - 1 && (
                        <span className="page-dots">...</span>
                      )}
                      <button
                        className={`btn-page-num ${currentPage === page ? 'active' : ''}`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    </span>
                  ))
                }
              </div>

              <button
                className="btn-page"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <span>Siguiente</span>
                <FiChevronRight />
              </button>
            </div>
          )}
          </>
        )}
      </div>
    </div>
  )
}

export default ZonaVip

import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { vipApi, userApi, newsApi } from '../services/api'
import { toast } from 'react-toastify'
import { FiStar, FiLock, FiClock, FiTrash2, FiImage, FiAlertTriangle, FiRefreshCw, FiCopy, FiBookmark, FiFilter, FiCalendar, FiChevronLeft, FiChevronRight, FiChevronDown, FiChevronUp, FiLayers, FiZap, FiX, FiLoader, FiCode, FiFileText, FiHash, FiCheck } from 'react-icons/fi'
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

  // Estados para modal de resumen IA
  const [showAIModal, setShowAIModal] = useState(false)
  const [aiSummary, setAiSummary] = useState(null)
  const [loadingAI, setLoadingAI] = useState(false)
  const [outputFormat, setOutputFormat] = useState('markdown') // markdown, html, text
  const [copiedFormat, setCopiedFormat] = useState(null)
  const [currentAIItem, setCurrentAIItem] = useState(null) // Item actual para IA

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

        // Mostrar alertas según días restantes (solo para vip_trial y vip)
        const { daysRemaining, isTrial } = response.data
        if (daysRemaining !== null && daysRemaining !== undefined) {
          const tipoSuscripcion = isTrial ? 'prueba VIP' : 'VIP'

          if (daysRemaining === 0) {
            toast.error(`Hoy es tu último día de ${tipoSuscripcion}. Activa VIP anual para mantener acceso.`, {
              autoClose: 10000
            })
          } else if (daysRemaining <= 3) {
            toast.warning(`Tu ${tipoSuscripcion} vence en ${daysRemaining} día${daysRemaining > 1 ? 's' : ''}. Considera renovar.`, {
              autoClose: 7000
            })
          } else if (daysRemaining <= 7) {
            toast.info(`Tu ${tipoSuscripcion} vence en ${daysRemaining} días.`, {
              autoClose: 5000
            })
          }
        }
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
      const response = await vipApi.getContent(150)
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

  // Agrupar contenido por groupId y consolidar texto con multimedia
  const groupedContent = useMemo(() => {
    if (viewMode === 'flat') {
      // Modo plano: cada item es su propio "grupo"
      return sortedContent.map(item => ({
        groupId: item.id,
        items: [item],
        mainItem: item,
        consolidatedItem: item, // En modo plano, el item consolidado es el mismo
        allMedia: item.imagen ? [item.imagen] : [],
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
          textItem: null, // Item que contiene el texto principal (con #titulo o #fuente)
          allMedia: [], // Toda la multimedia del grupo
          createdAt: null
        })
      }

      const group = groups.get(gid)
      group.items.push(item)

      // Recolectar toda la multimedia del grupo
      if (item.imagen) {
        group.allMedia.push({
          ...item.imagen,
          itemId: item.id // Referencia al item original
        })
      }

      // Identificar el item de texto principal (el que tiene #titulo o #fuente o más contenido)
      if (item.titulo || item.fuente) {
        // Prioridad 1: Item con título o fuente (hashtags)
        if (!group.textItem || (!group.textItem.titulo && item.titulo)) {
          group.textItem = item
        }
      } else if (item.contenido && !item.imagen) {
        // Prioridad 2: Item con contenido pero sin multimedia (texto puro)
        if (!group.textItem) {
          group.textItem = item
        }
      }

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

    // Convertir a array y procesar grupos
    const groupArray = Array.from(groups.values())

    // Ordenar items dentro de cada grupo y crear item consolidado
    groupArray.forEach(group => {
      group.items.sort((a, b) => getTimestamp(a) - getTimestamp(b))

      // Si hay múltiples items, crear un item consolidado
      if (group.items.length > 1) {
        // El textItem tiene prioridad, sino usamos el mainItem
        const primaryTextSource = group.textItem || group.mainItem || group.items[0]

        // Consolidar: tomar texto del textItem y multimedia de todos
        group.consolidatedItem = {
          id: group.groupId, // Usar groupId como id del consolidado
          titulo: primaryTextSource.titulo || '',
          fuente: primaryTextSource.fuente || '',
          contenido: primaryTextSource.contenido || '',
          sensible: primaryTextSource.sensible || [],
          createdAt: group.createdAt,
          // La multimedia se maneja aparte en allMedia
          imagen: null, // No usar imagen individual, usar allMedia
          isConsolidated: true,
          originalItems: group.items
        }

        // También recolectar contenido adicional de otros items que tengan texto relevante
        group.items.forEach(item => {
          if (item.id !== primaryTextSource.id && item.contenido && !item.imagen) {
            // Si hay otro item con contenido de texto (sin multimedia), agregarlo
            if (group.consolidatedItem.contenido) {
              group.consolidatedItem.contenido += '\n\n' + item.contenido
            } else {
              group.consolidatedItem.contenido = item.contenido
            }
          }
        })
      } else {
        // Grupo de un solo item
        group.consolidatedItem = group.items[0]
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

  // Generar resumen IA para contenido VIP
  const handleGenerateAISummary = async (item) => {
    if (loadingAI || !item.contenido) return

    setCurrentAIItem(item)
    setShowAIModal(true)
    setLoadingAI(true)
    setAiSummary(null)

    // Si no hay título, extraer las primeras palabras del contenido
    let title = item.titulo
    if (!title && item.contenido) {
      // Buscar la primera línea o los primeros 100 caracteres
      const firstLine = item.contenido.split('\n')[0].trim()
      title = firstLine.length > 100 ? firstLine.substring(0, 100) + '...' : firstLine
    }

    try {
      const response = await newsApi.getAISummary({
        title: title || 'Contenido VIP',
        description: item.contenido,
        source: item.fuente || 'Zona VIP',
        link: ''
      })

      if (response.success) {
        setAiSummary(response.data)
      } else {
        toast.error(response.error || 'Error al generar resumen')
        setShowAIModal(false)
      }
    } catch (err) {
      toast.error(err.message || 'Error al conectar con IA')
      setShowAIModal(false)
    } finally {
      setLoadingAI(false)
    }
  }

  // Formatear salida según el formato seleccionado
  const getFormattedOutput = () => {
    if (!aiSummary) return ''

    const { headline, lead, body, hashtags, source } = aiSummary
    const hashtagsStr = hashtags?.map(tag => `#${tag}`).join(' ') || ''

    switch (outputFormat) {
      case 'html':
        return `<article>
  <h1>${headline}</h1>
  <p><strong>${lead}</strong></p>
  ${body.split('\n\n').map(p => `<p>${p}</p>`).join('\n  ')}
${source ? `  <p><em>Fuente: ${source}</em></p>` : ''}
  <p>${hashtagsStr}</p>
</article>`

      case 'text':
        return `${headline}

${lead}

${body}

${source ? `Fuente: ${source}` : ''}

${hashtagsStr}`

      case 'markdown':
      default:
        return `# ${headline}

**${lead}**

${body}

${source ? `*Fuente: ${source}*` : ''}

${hashtagsStr}`
    }
  }

  // Copiar formato específico
  const copyFormattedOutput = async () => {
    try {
      await navigator.clipboard.writeText(getFormattedOutput())
      setCopiedFormat(outputFormat)
      toast.success(`Copiado en formato ${outputFormat.toUpperCase()}`)
      setTimeout(() => setCopiedFormat(null), 2000)
    } catch (err) {
      toast.error('Error al copiar')
    }
  }

  // Cerrar modal IA
  const closeAIModal = () => {
    if (!loadingAI) {
      setShowAIModal(false)
      setAiSummary(null)
      setCurrentAIItem(null)
    }
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
              <span className="filter-label"><FiFilter /> Ordenar por:</span>
              <div className="filter-buttons-row">
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
              const item = group.consolidatedItem
              const allMedia = group.allMedia || []

              // Función para renderizar un elemento multimedia individual
              const renderMediaItem = (media, index) => {
                if (media.type === 'video') {
                  return (
                    <video
                      key={media.fileId || index}
                      controls
                      preload="auto"
                      crossOrigin="anonymous"
                      playsInline
                      src={vipApi.getMediaUrl(media.fileId)}
                      onError={(e) => {
                        console.error('Error cargando video:', media.fileId, e)
                        e.target.parentElement.innerHTML = '<p class="media-error">Error al cargar video</p>'
                      }}
                    />
                  )
                }
                return (
                  <img
                    key={media.fileId || index}
                    src={vipApi.getMediaUrl(media.fileId)}
                    alt={item.titulo || 'Imagen VIP'}
                    onError={(e) => {
                      console.error('Error cargando imagen:', media.fileId)
                      e.target.parentElement.innerHTML = '<p class="media-error">Error al cargar imagen</p>'
                    }}
                  />
                )
              }

              const { text: displayText, isTruncated } = truncateText(item.contenido)
              const isTextExpanded = expandedTexts[item.id || group.groupId]

              return (
                <div
                  key={group.groupId}
                  className={`vip-content-card ${hasMultipleItems ? 'vip-card-consolidated' : ''}`}
                >
                  {/* PRIMERO: Título y Fuente (si existen) */}
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
                            onClick={() => toggleExpandText(item.id || group.groupId)}
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
                  </div>

                  {/* SEGUNDO: Toda la multimedia del grupo */}
                  {allMedia.length > 0 && (
                    <div className={`vip-content-media ${allMedia.length > 1 ? 'vip-media-gallery' : ''}`}>
                      {allMedia.length === 1 ? (
                        // Una sola imagen/video: mostrar normal
                        <div className="vip-content-image">
                          {renderMediaItem(allMedia[0], 0)}
                        </div>
                      ) : (
                        // Múltiples: mostrar como galería
                        <>
                          <div className="vip-gallery-header">
                            <FiImage size={14} />
                            <span>{allMedia.length} archivos multimedia</span>
                            {!isGroupExpanded && (
                              <button
                                className="btn-expand-gallery"
                                onClick={() => toggleGroupExpand(group.groupId)}
                              >
                                Ver todos <FiChevronDown size={14} />
                              </button>
                            )}
                          </div>
                          {/* Mostrar primera imagen siempre */}
                          <div className="vip-content-image vip-main-media">
                            {renderMediaItem(allMedia[0], 0)}
                          </div>
                          {/* Miniaturas o galería expandida */}
                          {isGroupExpanded ? (
                            <div className="vip-gallery-expanded">
                              {allMedia.slice(1).map((media, idx) => (
                                <div key={media.fileId || idx} className="vip-content-image">
                                  {renderMediaItem(media, idx + 1)}
                                </div>
                              ))}
                              <button
                                className="btn-collapse-gallery"
                                onClick={() => toggleGroupExpand(group.groupId)}
                              >
                                <FiChevronUp size={14} /> Colapsar galería
                              </button>
                            </div>
                          ) : (
                            <div className="vip-group-thumbnails">
                              {allMedia.slice(1, 4).map((media, idx) => (
                                <div
                                  key={media.fileId || idx}
                                  className="vip-thumbnail"
                                  onClick={() => toggleGroupExpand(group.groupId)}
                                >
                                  {media.type === 'video' ? (
                                    <div className="thumbnail-video">▶</div>
                                  ) : (
                                    <img
                                      src={vipApi.getMediaUrl(media.fileId)}
                                      alt=""
                                    />
                                  )}
                                </div>
                              ))}
                              {allMedia.length > 4 && (
                                <div
                                  className="vip-thumbnail vip-thumbnail-more"
                                  onClick={() => toggleGroupExpand(group.groupId)}
                                >
                                  +{allMedia.length - 4}
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* Si es item sin imagen pero el item original sí tenía */}
                  {allMedia.length === 0 && item.imagen && (
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

                  {/* Footer con acciones */}
                  <div className="vip-content-footer">
                    <span className="vip-content-date">
                      {formatDate(item.createdAt || group.createdAt)}
                      {hasMultipleItems && (
                        <span className="vip-consolidated-badge">
                          <FiLayers size={12} /> {group.items.length} elementos
                        </span>
                      )}
                    </span>
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
                      {item.contenido && (
                        <button
                          className="btn-action-vip btn-ai"
                          onClick={() => handleGenerateAISummary(item)}
                          disabled={loadingAI}
                          title="Generar resumen con IA"
                        >
                          <FiZap />
                        </button>
                      )}
                      {(profile?.role === 'admin') && hasMultipleItems && (
                        <button
                          className="btn-action-vip btn-expand-items"
                          onClick={() => toggleGroupExpand(group.groupId)}
                          title={isGroupExpanded ? 'Colapsar elementos' : 'Ver elementos individuales'}
                        >
                          {isGroupExpanded ? <FiChevronUp /> : <FiChevronDown />}
                        </button>
                      )}
                      {(profile?.role === 'admin') && !hasMultipleItems && (
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

                  {/* Para admin: mostrar elementos individuales del grupo si está expandido */}
                  {(profile?.role === 'admin') && hasMultipleItems && isGroupExpanded && (
                    <div className="vip-group-individual-items">
                      <div className="vip-individual-items-header">
                        <span>Elementos individuales del grupo:</span>
                      </div>
                      {group.items.map(originalItem => (
                        <div key={originalItem.id} className="vip-individual-item">
                          <div className="vip-individual-content">
                            {originalItem.imagen && (
                              <span className="vip-individual-type">
                                {originalItem.imagen.type === 'video' ? '🎬 Video' : '📷 Foto'}
                              </span>
                            )}
                            {originalItem.titulo && <strong>{originalItem.titulo}</strong>}
                            {originalItem.contenido && (
                              <span className="vip-individual-text">
                                {originalItem.contenido.substring(0, 50)}...
                              </span>
                            )}
                          </div>
                          <button
                            className="btn-action-vip btn-delete"
                            onClick={() => handleDeleteContent(originalItem.id)}
                            title="Eliminar este elemento"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
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

      {/* Modal de Resumen IA - usando portal para evitar problemas de z-index */}
      {showAIModal && createPortal(
        <div className="ai-modal-overlay" onClick={closeAIModal}>
          <div className="ai-modal" onClick={e => e.stopPropagation()}>
            <div className="ai-modal-header">
              <h3><FiZap /> Resumen IA</h3>
              <button
                className="ai-modal-close"
                onClick={closeAIModal}
                disabled={loadingAI}
                title="Cerrar"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="ai-modal-content">
              {loadingAI ? (
                <div className="ai-loading">
                  <FiLoader size={40} className="spinner" />
                  <p>Generando resumen con Claude IA...</p>
                </div>
              ) : aiSummary ? (
                <>
                  {/* Categoría detectada */}
                  <div className="ai-category">
                    <span className="ai-category-badge">{aiSummary.category}</span>
                    <span className="ai-confidence">
                      {Math.round(aiSummary.confidence * 100)}% confianza
                    </span>
                  </div>

                  {/* Contenido periodístico sin etiquetas */}
                  <div className="ai-article">
                    <h2 className="ai-headline">{aiSummary.headline}</h2>
                    <p className="ai-lead"><strong>{aiSummary.lead}</strong></p>
                    <div className="ai-body">
                      {aiSummary.body.split('\n\n').map((paragraph, idx) => (
                        <p key={idx}>{paragraph}</p>
                      ))}
                    </div>
                  </div>

                  {/* Hashtags */}
                  <div className="ai-hashtags">
                    {aiSummary.hashtags?.map((tag, idx) => (
                      <span key={idx} className="hashtag">#{tag}</span>
                    ))}
                  </div>

                  {/* Disclaimer IA */}
                  <p className="ai-disclaimer">La IA puede cometer errores, siempre revisa la información.</p>

                  {/* Selector de formato */}
                  <div className="ai-format-selector">
                    <span>Formato de salida:</span>
                    <div className="format-buttons">
                      <button
                        className={outputFormat === 'markdown' ? 'active' : ''}
                        onClick={() => setOutputFormat('markdown')}
                        title="Markdown"
                      >
                        <FiHash size={16} /> MD
                      </button>
                      <button
                        className={outputFormat === 'html' ? 'active' : ''}
                        onClick={() => setOutputFormat('html')}
                        title="HTML"
                      >
                        <FiCode size={16} /> HTML
                      </button>
                      <button
                        className={outputFormat === 'text' ? 'active' : ''}
                        onClick={() => setOutputFormat('text')}
                        title="Texto plano"
                      >
                        <FiFileText size={16} /> TXT
                      </button>
                    </div>
                  </div>

                  {/* Preview del formato */}
                  <div className="ai-preview">
                    <pre>{getFormattedOutput()}</pre>
                  </div>

                  {/* Botón copiar */}
                  <button
                    className={`ai-copy-btn ${copiedFormat ? 'copied' : ''}`}
                    onClick={copyFormattedOutput}
                  >
                    {copiedFormat ? <FiCheck size={18} /> : <FiCopy size={18} />}
                    {copiedFormat ? 'Copiado!' : `Copiar ${outputFormat.toUpperCase()}`}
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default ZonaVip

import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { newsApi, userApi } from '../services/api'
import Header from '../components/Header'
import FilterPanel from '../components/FilterPanel'
import NewsCard from '../components/NewsCard'
import LoadingSpinner from '../components/LoadingSpinner'
import {
  FiSearch, FiCopy, FiCheck, FiRefreshCw, FiSave, FiTrash2, FiX, FiArrowUp, FiZap,
  FiGrid, FiPlus, FiAlertCircle
} from 'react-icons/fi'

const Generator = () => {
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState('search') // search, profiles, breaking
  const [filters, setFilters] = useState({
    tematicas: [],
    provincia: '',
    distrito: '',
    localidad: '',
    keywords: [],
    excludeTerms: [],
    contentType: 'all'
  })
  const [news, setNews] = useState([])
  const [searchProfiles, setSearchProfiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingProfiles, setLoadingProfiles] = useState(true)
  const [copiedAll, setCopiedAll] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [searchCount, setSearchCount] = useState(10)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [breakingNews, setBreakingNews] = useState([])
  const [loadingBreaking, setLoadingBreaking] = useState(false)
  const [breakingLoadCount, setBreakingLoadCount] = useState(0) // Contador de cargas (máx 8 - todos los grupos)
  const [breakingOffset, setBreakingOffset] = useState(0) // Offset para paginación
  const [loadingMoreBreaking, setLoadingMoreBreaking] = useState(false) // Loading para "cargar más"
  const [selectedProfileId, setSelectedProfileId] = useState('')
  const [filtersCollapsed, setFiltersCollapsed] = useState(false)  // Para colapsar filtros en móvil
  const [gridColumns, setGridColumns] = useState(() => {
    const saved = localStorage.getItem('newsGridColumns')
    return saved ? parseInt(saved, 10) : 3
  })
  const [maxColumns, setMaxColumns] = useState(5) // Máximo de columnas según viewport

  // Cargar perfiles al inicio
  useEffect(() => {
    loadProfiles()
  }, [])

  // Detectar scroll para mostrar botón "volver arriba"
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Detectar viewport para ajustar máximo de columnas
  useEffect(() => {
    const updateMaxColumns = () => {
      const isLandscape = window.matchMedia('(orientation: landscape)').matches
      const width = window.innerWidth

      if (width <= 768 && !isLandscape) {
        setMaxColumns(1) // Portrait móvil: no mostrar selector
      } else if (width <= 900 && isLandscape) {
        setMaxColumns(3) // Landscape móvil: máximo 3
      } else if (width <= 992) {
        setMaxColumns(3) // Tablet: máximo 3
      } else {
        setMaxColumns(5) // Desktop: todas
      }
    }

    updateMaxColumns()
    window.addEventListener('resize', updateMaxColumns)
    window.addEventListener('orientationchange', updateMaxColumns)

    return () => {
      window.removeEventListener('resize', updateMaxColumns)
      window.removeEventListener('orientationchange', updateMaxColumns)
    }
  }, [])

  // Cargar perfil desde URL si existe
  useEffect(() => {
    const profileId = searchParams.get('profile')
    const tab = searchParams.get('tab')

    if (tab === 'profiles') {
      setActiveTab('profiles')
    }

    if (profileId && searchProfiles.length > 0) {
      const profile = searchProfiles.find(p => p.id === profileId)
      if (profile) {
        // Desde URL: aplicar perfil y buscar automáticamente
        applyProfile(profile, true)
      }
    }
  }, [searchParams, searchProfiles])

  const loadProfiles = async () => {
    try {
      const response = await userApi.getSearchProfiles()
      if (response.success) {
        setSearchProfiles(response.data)
      }
    } catch (error) {
      console.error('Error cargando perfiles:', error)
    } finally {
      setLoadingProfiles(false)
    }
  }

  const applyProfile = (profile, autoSearch = true) => {
    const newFilters = {
      tematicas: profile.tematicas || [],
      provincia: profile.provincia || '',
      distrito: profile.distrito || '',
      localidad: profile.localidad || '',
      keywords: profile.keywords || [],
      excludeTerms: profile.excludeTerms || [],
      contentType: profile.contentType || 'all'
    }

    setFilters(newFilters)
    setSelectedProfileId(profile.id) // Mantener el perfil seleccionado visible
    setActiveTab('search')

    // Ejecutar búsqueda automáticamente después de aplicar el perfil
    if (autoSearch) {
      // Pequeño delay para que se actualice el estado
      setTimeout(() => {
        handleSearchWithFilters(newFilters)
      }, 100)
    }

    toast.success(`Perfil "${profile.name}" aplicado`)
  }

  // Función auxiliar para buscar con filtros específicos
  // Detectar si es móvil (menos de 768px)
  const isMobile = () => window.innerWidth < 768

  const handleSearchWithFilters = async (searchFilters) => {
    try {
      setLoading(true)
      setNews([])
      // Colapsar filtros SOLO en móvil para mostrar resultados
      if (isMobile()) {
        setFiltersCollapsed(true)
        // Scroll a la zona de resultados en móvil
        setTimeout(() => {
          const resultsArea = document.querySelector('.results-area')
          if (resultsArea) {
            resultsArea.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }, 150)
      }

      const params = {
        maxItems: searchCount,
        translate: 'true',
        shorten: 'true',
        generateEmojis: 'true'
      }

      if (searchFilters.tematicas.length > 0) {
        params.tematicas = searchFilters.tematicas.join(',')
      }
      if (searchFilters.provincia) params.provincia = searchFilters.provincia
      if (searchFilters.distrito) params.distrito = searchFilters.distrito
      if (searchFilters.localidad) params.localidad = searchFilters.localidad
      if (searchFilters.keywords.length > 0) {
        params.keywords = searchFilters.keywords.join(',')
      }
      if (searchFilters.excludeTerms.length > 0) {
        params.excludeTerms = searchFilters.excludeTerms.join(',')
      }
      // Siempre enviar contentType (por defecto 'all')
      params.contentType = searchFilters.contentType || 'all'

      const response = await newsApi.search(params)

      if (response.success) {
        setNews(response.data)
        if (response.data.length === 0) {
          toast.info('No se encontraron noticias con esos filtros')
        }
      }
    } catch (error) {
      console.error('Error buscando:', error)
      toast.error('Error al buscar noticias')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    try {
      setLoading(true)
      setNews([])
      // Colapsar filtros SOLO en móvil para mostrar resultados
      if (isMobile()) {
        setFiltersCollapsed(true)
      }

      const params = {
        maxItems: searchCount,
        translate: 'true',
        shorten: 'true',
        generateEmojis: 'true'
      }

      if (filters.tematicas.length > 0) {
        params.tematicas = filters.tematicas.join(',')
      }
      if (filters.provincia) params.provincia = filters.provincia
      if (filters.distrito) params.distrito = filters.distrito
      if (filters.localidad) params.localidad = filters.localidad
      if (filters.keywords.length > 0) {
        params.keywords = filters.keywords.join(',')
      }
      if (filters.excludeTerms.length > 0) {
        params.excludeTerms = filters.excludeTerms.join(',')
      }
      if (filters.contentType && filters.contentType !== 'all') {
        params.contentType = filters.contentType
      }

      const response = await newsApi.search(params)

      if (response.success) {
        setNews(response.data)
        if (response.data.length === 0) {
          toast.info('No se encontraron noticias con esos filtros')
        }
      }
    } catch (error) {
      console.error('Error buscando:', error)
      toast.error('Error al buscar noticias')
    } finally {
      setLoading(false)
    }
  }

  const copyAllNews = async () => {
    try {
      const allText = news
        .map(n => n.formattedText)
        .join('\n\n' + '─'.repeat(40) + '\n\n')

      await navigator.clipboard.writeText(allText)
      setCopiedAll(true)
      toast.success('Todas las noticias copiadas')
      setTimeout(() => setCopiedAll(false), 2000)
    } catch (err) {
      toast.error('Error al copiar')
    }
  }

  const handleSaveProfile = async () => {
    if (!profileName.trim()) {
      toast.error('Ingresa un nombre para el perfil')
      return
    }

    try {
      const response = await userApi.createSearchProfile({
        name: profileName.trim(),
        ...filters
      })

      if (response.success) {
        toast.success('Perfil guardado')
        setSearchProfiles(prev => [response.data, ...prev])
        setShowSaveModal(false)
        setProfileName('')
      }
    } catch (error) {
      toast.error(error.message || 'Error al guardar perfil')
    }
  }

  const handleDeleteProfile = async (profileId) => {
    if (!confirm('¿Eliminar este perfil de búsqueda?')) return

    try {
      await userApi.deleteSearchProfile(profileId)
      setSearchProfiles(prev => prev.filter(p => p.id !== profileId))
      toast.success('Perfil eliminado')
    } catch (error) {
      toast.error('Error al eliminar perfil')
    }
  }

  const clearFilters = () => {
    setFilters({
      tematicas: [],
      provincia: '',
      distrito: '',
      localidad: '',
      keywords: [],
      excludeTerms: [],
      contentType: 'all'
    })
    // También limpiar el selector de perfil
    setSelectedProfileId('')
  }

  const hasActiveFilters = () => {
    return filters.tematicas.length > 0 ||
      filters.provincia ||
      filters.localidad ||
      filters.keywords.length > 0
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleColumnChange = (cols) => {
    setGridColumns(cols)
    localStorage.setItem('newsGridColumns', cols.toString())
  }

  // Grupos de categorías para cargas incrementales en ÚLTIMO MOMENTO
  // Incluye todas las temáticas RSS y todas las provincias argentinas
  const categoryGroups = [
    // Grupo 1: Principales nacionales
    ['nacionales', 'politica', 'economia'],
    // Grupo 2: Entretenimiento y tech
    ['deportes', 'espectaculos', 'tecnologia'],
    // Grupo 3: Policiales e internacionales
    ['policiales', 'internacionales'],
    // Grupo 4: Provincias principales (más población)
    ['buenosaires', 'cordoba', 'santafe', 'mendoza'],
    // Grupo 5: NOA (Noroeste)
    ['tucuman', 'salta', 'jujuy', 'catamarca', 'santiago'],
    // Grupo 6: NEA (Noreste)
    ['chaco', 'corrientes', 'misiones', 'formosa', 'entrerios'],
    // Grupo 7: Cuyo
    ['sanjuan', 'sanluis', 'larioja', 'lapampa'],
    // Grupo 8: Patagonia
    ['neuquen', 'rionegro', 'chubut', 'santacruz', 'tierradelfuego']
  ]

  const loadBreakingNews = async (isRefresh = true) => {
    try {
      if (isRefresh) {
        setLoadingBreaking(true)
        setBreakingNews([])
        setBreakingLoadCount(1)
        setBreakingOffset(0)
      }

      // Primera carga: categorías principales
      const response = await newsApi.getRssNews({
        categories: categoryGroups[0].join(','),
        maxItems: 20,
        hoursAgo: 72,
        translate: 'true',
        shorten: 'true',
        generateEmojis: 'true'
      })

      if (response.success) {
        // Ordenar por fecha más reciente
        const sortedNews = response.data.sort((a, b) => {
          const dateA = new Date(a.pubDate || 0)
          const dateB = new Date(b.pubDate || 0)
          return dateB - dateA
        })
        setBreakingNews(sortedNews)
      }
    } catch (error) {
      console.error('Error cargando último momento:', error)
      toast.error('Error al cargar noticias de último momento')
    } finally {
      setLoadingBreaking(false)
    }
  }

  const loadMoreBreakingNews = async () => {
    if (breakingLoadCount >= 8) return

    try {
      setLoadingMoreBreaking(true)

      // Usar el siguiente grupo de categorías
      const nextGroupIndex = breakingLoadCount
      const categories = categoryGroups[nextGroupIndex] || categoryGroups[0]

      const response = await newsApi.getRssNews({
        categories: categories.join(','),
        maxItems: 20,
        hoursAgo: 72,
        translate: 'true',
        shorten: 'true',
        generateEmojis: 'true'
      })

      if (response.success && response.data.length > 0) {
        // Filtrar noticias duplicadas por link
        const existingLinks = new Set(breakingNews.map(n => n.link))
        const newNews = response.data.filter(n => !existingLinks.has(n.link))

        // Ordenar las nuevas por fecha
        const sortedNew = newNews.sort((a, b) => {
          const dateA = new Date(a.pubDate || 0)
          const dateB = new Date(b.pubDate || 0)
          return dateB - dateA
        })

        if (sortedNew.length > 0) {
          setBreakingNews(prev => [...prev, ...sortedNew])
          toast.success(`${sortedNew.length} noticias nuevas cargadas`)
        } else {
          toast.info('No hay más noticias nuevas en esta categoría')
        }

        setBreakingLoadCount(prev => prev + 1)
      } else {
        toast.info('No hay más noticias disponibles')
        setBreakingLoadCount(prev => prev + 1)
      }
    } catch (error) {
      console.error('Error cargando más noticias:', error)
      toast.error('Error al cargar más noticias')
    } finally {
      setLoadingMoreBreaking(false)
    }
  }

  const resetBreakingNews = () => {
    setBreakingNews([])
    setBreakingLoadCount(0)
    setBreakingOffset(0)
    loadBreakingNews(true)
  }

  return (
    <div className="generator-page">
      <Header />

      <main className="generator-main container">
        <div className="generator-header">
          <h1>Generador de Noticias</h1>
          <div className="tabs">
            {/* Botón Buscar Noticias - en la misma línea que los tabs */}
            {activeTab === 'search' && (
              <button
                className="btn btn-primary btn-search-main"
                onClick={handleSearch}
                disabled={loading}
              >
                {loading ? (
                  <LoadingSpinner size="small" />
                ) : (
                  <>
                    <FiSearch size={18} />
                    <span className="tab-text">Buscar Noticias</span>
                  </>
                )}
              </button>
            )}
            {activeTab !== 'search' && (
              <button
                className="tab"
                onClick={() => setActiveTab('search')}
              >
                <FiSearch size={18} />
                <span className="tab-text">Panel Principal</span>
              </button>
            )}
            <button
              className={`tab tab-breaking ${activeTab === 'breaking' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('breaking')
                loadBreakingNews()
              }}
            >
              <FiZap size={18} />
              <span className="tab-text">ÚLTIMO</span>
            </button>
            <button
              className={`tab ${activeTab === 'profiles' ? 'active' : ''}`}
              onClick={() => setActiveTab('profiles')}
            >
              <FiSave size={18} />
              <span className="tab-text">Perfiles</span>
            </button>
          </div>
        </div>

        <div className="generator-content">
          {activeTab === 'search' ? (
            <>
              {/* Panel de filtros */}
              <aside className="filters-sidebar">
                <FilterPanel
                  filters={filters}
                  onChange={(newFilters) => {
                    setFilters(newFilters)
                    setFiltersCollapsed(false)  // Expandir filtros cuando el usuario interactúa
                  }}
                  onSaveProfile={() => setShowSaveModal(true)}
                  savedProfiles={searchProfiles}
                  selectedProfileId={selectedProfileId}
                  onSelectProfile={(id) => {
                    const profile = searchProfiles.find(p => p.id === id)
                    if (profile) applyProfile(profile)
                  }}
                  collapsed={filtersCollapsed}
                />

                {hasActiveFilters() && (
                  <button className="btn btn-text btn-clear" onClick={clearFilters}>
                    <FiX size={16} />
                    Limpiar filtros
                  </button>
                )}
              </aside>

              {/* Área de resultados */}
              <div className="results-area">
                <div className="search-controls">
                  <div className="count-selector">
                    <label>Cantidad:</label>
                    <select
                      value={searchCount}
                      onChange={(e) => setSearchCount(Number(e.target.value))}
                    >
                      <option value={5}>5 noticias</option>
                      <option value={10}>10 noticias</option>
                      <option value={15}>15 noticias</option>
                      <option value={20}>20 noticias</option>
                    </select>
                  </div>

                  {/* Botón secundario de búsqueda solo visible en móvil */}
                  <button
                    className="btn btn-primary btn-search-mobile"
                    onClick={handleSearch}
                    disabled={loading}
                  >
                    {loading ? (
                      <LoadingSpinner size="small" />
                    ) : (
                      <>
                        <FiSearch size={18} />
                        Buscar
                      </>
                    )}
                  </button>
                </div>

                {/* Resultados */}
                {loading ? (
                  <div className="loading-results">
                    <LoadingSpinner size="large" text="Buscando noticias..." />
                  </div>
                ) : news.length > 0 ? (
                  <>
                    <div className="results-header">
                      <span>{news.length} noticias encontradas</span>
                      <div className="results-actions">
                        {/* Selector de columnas */}
                        <div className="column-selector">
                          {[2, 3, 4, 5].filter(cols => cols <= maxColumns).map(cols => (
                            <button
                              key={cols}
                              className={`col-btn ${gridColumns === cols ? 'active' : ''}`}
                              onClick={() => handleColumnChange(cols)}
                              title={`${cols} columnas`}
                            >
                              <FiGrid size={14} />
                              <span>{cols}</span>
                            </button>
                          ))}
                        </div>
                        <button
                          className={`btn btn-secondary ${copiedAll ? 'copied' : ''}`}
                          onClick={copyAllNews}
                        >
                          {copiedAll ? <FiCheck size={16} /> : <FiCopy size={16} />}
                          {copiedAll ? 'Copiado' : 'Copiar Todo'}
                        </button>
                        <button
                          className="btn btn-text"
                          onClick={handleSearch}
                        >
                          <FiRefreshCw size={16} />
                          Actualizar
                        </button>
                      </div>
                    </div>

                    <div className={`news-grid grid-cols-${gridColumns}`}>
                      {news.map((item, index) => (
                        <NewsCard key={index} news={item} />
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="empty-results">
                    <FiSearch size={48} />
                    <h3>Configura tus filtros y busca noticias</h3>
                    <p>Selecciona temáticas, provincia o agrega palabras clave para comenzar</p>
                  </div>
                )}
              </div>
            </>
          ) : activeTab === 'breaking' ? (
            /* Tab de ÚLTIMO MOMENTO */
            <div className="breaking-section">
              <div className="breaking-header">
                <h2><FiZap /> ÚLTIMO MOMENTO - Noticias Recientes</h2>
                <p>Las noticias más importantes de las últimas horas</p>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => loadBreakingNews(true)}
                  disabled={loadingBreaking}
                >
                  <FiRefreshCw className={loadingBreaking ? 'spinning' : ''} />
                  Actualizar
                </button>
              </div>

              {loadingBreaking ? (
                <LoadingSpinner size="large" text="Cargando últimas noticias..." />
              ) : breakingNews.length === 0 ? (
                <div className="empty-state">
                  <FiZap size={48} />
                  <h3>No hay noticias recientes</h3>
                  <p>Intenta actualizar en unos minutos</p>
                </div>
              ) : (
                <>
                  <div className="results-header">
                    <span>{breakingNews.length} noticias recientes (carga {breakingLoadCount}/8)</span>
                    <div className="column-selector">
                      {[2, 3, 4, 5].filter(cols => cols <= maxColumns).map(cols => (
                        <button
                          key={cols}
                          className={`col-btn ${gridColumns === cols ? 'active' : ''}`}
                          onClick={() => handleColumnChange(cols)}
                          title={`${cols} columnas`}
                        >
                          <FiGrid size={14} />
                          <span>{cols}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className={`news-grid grid-cols-${gridColumns}`}>
                    {breakingNews.map((item, index) => (
                      <NewsCard key={index} news={item} />
                    ))}
                  </div>

                  {/* Botón Cargar Más o Mensaje de Límite */}
                  <div className="load-more-section">
                    {breakingLoadCount < 8 ? (
                      <button
                        className="btn btn-load-more"
                        onClick={loadMoreBreakingNews}
                        disabled={loadingMoreBreaking}
                      >
                        {loadingMoreBreaking ? (
                          <>
                            <LoadingSpinner size="small" />
                            Cargando más noticias...
                          </>
                        ) : (
                          <>
                            <FiPlus size={20} />
                            Cargar más noticias ({breakingLoadCount}/8 cargas)
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="limit-reached">
                        <FiAlertCircle size={24} />
                        <div className="limit-message">
                          <strong>Límite de cargas alcanzado</strong>
                          <p>Has cargado {breakingNews.length} noticias. Para ver más noticias nuevas, limpia los resultados y vuelve a buscar.</p>
                        </div>
                        <button
                          className="btn btn-primary"
                          onClick={resetBreakingNews}
                        >
                          <FiRefreshCw size={18} />
                          Reiniciar búsqueda
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Tab de Perfiles */
            <div className="profiles-section">
              {loadingProfiles ? (
                <LoadingSpinner size="medium" text="Cargando perfiles..." />
              ) : searchProfiles.length === 0 ? (
                <div className="empty-profiles">
                  <FiSave size={48} />
                  <h3>No tienes perfiles guardados</h3>
                  <p>Los perfiles te permiten guardar tus filtros favoritos para usarlos rápidamente</p>
                  <button
                    className="btn btn-primary"
                    onClick={() => setActiveTab('search')}
                  >
                    Crear mi primer perfil
                  </button>
                </div>
              ) : (
                <div className="profiles-list">
                  {searchProfiles.map(profile => (
                    <div key={profile.id} className="profile-item">
                      <div className="profile-info">
                        <h3>{profile.name}</h3>
                        <div className="profile-details">
                          {profile.tematicas?.length > 0 && (
                            <span>Temáticas: {profile.tematicas.join(', ')}</span>
                          )}
                          {profile.provincia && (
                            <span>Provincia: {profile.provincia}</span>
                          )}
                          {profile.keywords?.length > 0 && (
                            <span>Keywords: {profile.keywords.join(', ')}</span>
                          )}
                        </div>
                      </div>
                      <div className="profile-actions">
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => applyProfile(profile)}
                        >
                          <FiSearch size={14} />
                          Usar
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteProfile(profile.id)}
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Modal para guardar perfil */}
      {showSaveModal && (
        <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Guardar Perfil de Búsqueda</h2>
            <div className="form-group">
              <label>Nombre del perfil:</label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Ej: Noticias Deportivas Córdoba"
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowSaveModal(false)}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveProfile}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Botón Scroll to Top */}
      {showScrollTop && (
        <button
          className="scroll-to-top"
          onClick={scrollToTop}
          aria-label="Volver arriba"
        >
          <FiArrowUp size={24} />
        </button>
      )}
    </div>
  )
}

export default Generator

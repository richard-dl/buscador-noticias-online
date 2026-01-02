import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'
import { newsApi, userApi } from '../services/api'
import Header from '../components/Header'
import FilterPanel from '../components/FilterPanel'
import NewsCard from '../components/NewsCard'
import LoadingSpinner from '../components/LoadingSpinner'
import {
  FiSearch, FiCopy, FiCheck, FiRefreshCw, FiSave, FiTrash2, FiX, FiZap,
  FiGrid, FiPlus
} from 'react-icons/fi'

const Generator = () => {
  const { requireAuth, isAuthenticated } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
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
  const [breakingNews, setBreakingNews] = useState([])
  const [loadingBreaking, setLoadingBreaking] = useState(false)
  const [loadingMoreBreaking, setLoadingMoreBreaking] = useState(false)
  const [breakingTab, setBreakingTab] = useState('nacionales') // nacionales, provinciales, internacionales
  const [breakingLoadCount, setBreakingLoadCount] = useState(1) // Contador de cargas (máx 6)
  const [breakingHoursAgo, setBreakingHoursAgo] = useState(6) // Horas para buscar (incrementa)
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
    } else if (tab === 'breaking') {
      setActiveTab('breaking')
      loadBreakingNews()
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
    // Verificar autenticación antes de buscar
    if (!requireAuth('buscar noticias')) return

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
    // Verificar autenticación antes de buscar
    if (!requireAuth('buscar noticias')) return

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
    // Verificar autenticación antes de guardar
    if (!requireAuth('guardar perfiles')) return

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

  const handleColumnChange = (cols) => {
    setGridColumns(cols)
    localStorage.setItem('newsGridColumns', cols.toString())
  }

  // Categorías para cada tab de ÚLTIMO MOMENTO
  const breakingCategories = {
    nacionales: ['nacionales', 'politica', 'economia', 'deportes', 'espectaculos', 'tecnologia', 'policiales'],
    provinciales: [
      'buenosaires', 'catamarca', 'chaco', 'chubut', 'cordoba', 'corrientes',
      'entrerios', 'formosa', 'jujuy', 'lapampa', 'larioja', 'mendoza', 'misiones',
      'neuquen', 'rionegro', 'salta', 'sanjuan', 'sanluis', 'santacruz', 'santafe',
      'santiago', 'tierradelfuego', 'tucuman'
    ],
    internacionales: ['internacionales']
  }

  const loadBreakingNews = async (tab = breakingTab, isRefresh = true) => {
    try {
      setLoadingBreaking(true)
      if (isRefresh) {
        setBreakingNews([])
        setBreakingLoadCount(1)
        setBreakingHoursAgo(6)
      }

      const categories = breakingCategories[tab] || breakingCategories.nacionales

      const response = await newsApi.getRssNews({
        categories: categories.join(','),
        maxItems: 30,
        hoursAgo: 6, // Primera carga: últimas 6 horas
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

        if (sortedNews.length === 0) {
          toast.info('No hay noticias de las últimas 6 horas en esta categoría')
        }
      }
    } catch (error) {
      console.error('Error cargando último momento:', error)
      toast.error('Error al cargar noticias de último momento')
    } finally {
      setLoadingBreaking(false)
    }
  }

  const loadMoreBreakingNews = async () => {
    if (breakingLoadCount >= 6) return

    try {
      setLoadingMoreBreaking(true)

      // Incrementar el rango de horas (6h -> 12h -> 24h -> 48h -> 72h -> 96h)
      const hoursIncrement = [6, 12, 24, 48, 72, 96]
      const newHoursAgo = hoursIncrement[breakingLoadCount] || 96

      const categories = breakingCategories[breakingTab] || breakingCategories.nacionales

      const response = await newsApi.getRssNews({
        categories: categories.join(','),
        maxItems: 30,
        hoursAgo: newHoursAgo,
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
          toast.success(`${sortedNew.length} noticias adicionales cargadas`)
        } else {
          toast.info('No hay más noticias nuevas disponibles')
        }

        setBreakingLoadCount(prev => prev + 1)
        setBreakingHoursAgo(newHoursAgo)
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

  const handleBreakingTabChange = (tab) => {
    setBreakingTab(tab)
    loadBreakingNews(tab, true)
  }

  return (
    <div className="generator-page">
      <Header />

      <main className="generator-main container">
        <div className="generator-header">
          <h1>Generador de Noticias</h1>
          <div className="tabs">
            {/* Selector de cantidad (solo desktop) y Botón Buscar Noticias */}
            {activeTab === 'search' && (
              <>
                <div className="count-selector count-selector-desktop">
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
                <button
                  className="btn btn-primary btn-search-main"
                onClick={() => {
                  if (!isAuthenticated) {
                    navigate('/subscription')
                    return
                  }
                  handleSearch()
                }}
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
              </>
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
                if (!isAuthenticated) {
                  navigate('/subscription')
                  return
                }
                setActiveTab('breaking')
                loadBreakingNews()
              }}
            >
              <FiZap size={18} />
              <span className="tab-text">ÚLTIMO</span>
              <span className="tab-text-desktop">ÚLTIMO MOMENTO</span>
            </button>
            <button
              className={`tab ${activeTab === 'profiles' ? 'active' : ''}`}
              onClick={() => {
                if (!isAuthenticated) {
                  navigate('/subscription')
                  return
                }
                setActiveTab('profiles')
              }}
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
                <div className="search-controls search-controls-mobile">
                  <div className="count-selector count-selector-mobile">
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
                <h2><FiZap /> ÚLTIMO MOMENTO</h2>
                <p>Noticias de las últimas 6 horas</p>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => loadBreakingNews(breakingTab)}
                  disabled={loadingBreaking}
                >
                  <FiRefreshCw className={loadingBreaking ? 'spinning' : ''} />
                  Actualizar
                </button>
              </div>

              {/* Sub-tabs para categorías */}
              <div className="breaking-tabs">
                <button
                  className={`breaking-tab ${breakingTab === 'nacionales' ? 'active' : ''}`}
                  onClick={() => handleBreakingTabChange('nacionales')}
                  disabled={loadingBreaking}
                >
                  Nacionales
                </button>
                <button
                  className={`breaking-tab ${breakingTab === 'provinciales' ? 'active' : ''}`}
                  onClick={() => handleBreakingTabChange('provinciales')}
                  disabled={loadingBreaking}
                >
                  Provinciales
                </button>
                <button
                  className={`breaking-tab ${breakingTab === 'internacionales' ? 'active' : ''}`}
                  onClick={() => handleBreakingTabChange('internacionales')}
                  disabled={loadingBreaking}
                >
                  Internacionales
                </button>
              </div>

              {loadingBreaking ? (
                <LoadingSpinner size="large" text="Cargando últimas noticias..." />
              ) : breakingNews.length === 0 ? (
                <div className="empty-state">
                  <FiZap size={48} />
                  <h3>No hay noticias de las últimas 6 horas</h3>
                  <p>Intenta con otra categoría o actualiza en unos minutos</p>
                </div>
              ) : (
                <>
                  <div className="results-header">
                    <span>{breakingNews.length} noticias (últimas {breakingHoursAgo}h) - Carga {breakingLoadCount}/6</span>
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

                  {/* Botón Cargar Más */}
                  {breakingLoadCount < 6 && (
                    <div className="load-more-section">
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
                            Cargar más noticias
                          </>
                        )}
                      </button>
                    </div>
                  )}
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

      </div>
  )
}

export default Generator

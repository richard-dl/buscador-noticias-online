import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { newsApi, userApi } from '../services/api'
import Header from '../components/Header'
import FilterPanel from '../components/FilterPanel'
import NewsCard from '../components/NewsCard'
import LoadingSpinner from '../components/LoadingSpinner'
import {
  FiSearch, FiCopy, FiCheck, FiRefreshCw, FiSave, FiTrash2, FiX
} from 'react-icons/fi'

const Generator = () => {
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState('search') // search, profiles
  const [filters, setFilters] = useState({
    tematicas: [],
    provincia: '',
    distrito: '',
    localidad: '',
    keywords: [],
    excludeTerms: []
  })
  const [news, setNews] = useState([])
  const [searchProfiles, setSearchProfiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingProfiles, setLoadingProfiles] = useState(true)
  const [copiedAll, setCopiedAll] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [searchCount, setSearchCount] = useState(10)

  // Cargar perfiles al inicio
  useEffect(() => {
    loadProfiles()
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
      excludeTerms: profile.excludeTerms || []
    }
    setFilters(newFilters)
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
  const handleSearchWithFilters = async (searchFilters) => {
    try {
      setLoading(true)
      setNews([])

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
      excludeTerms: []
    })
  }

  const hasActiveFilters = () => {
    return filters.tematicas.length > 0 ||
      filters.provincia ||
      filters.localidad ||
      filters.keywords.length > 0
  }

  return (
    <div className="generator-page">
      <Header />

      <main className="generator-main container">
        <div className="generator-header">
          <h1>Generador de Noticias</h1>
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'search' ? 'active' : ''}`}
              onClick={() => setActiveTab('search')}
            >
              <FiSearch size={18} />
              Buscar
            </button>
            <button
              className={`tab ${activeTab === 'profiles' ? 'active' : ''}`}
              onClick={() => setActiveTab('profiles')}
            >
              <FiSave size={18} />
              Perfiles ({searchProfiles.length})
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
                  onChange={setFilters}
                  onSaveProfile={() => setShowSaveModal(true)}
                  savedProfiles={searchProfiles}
                  onSelectProfile={(id) => {
                    const profile = searchProfiles.find(p => p.id === id)
                    if (profile) applyProfile(profile)
                  }}
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

                  <button
                    className="btn btn-primary"
                    onClick={handleSearch}
                    disabled={loading}
                  >
                    {loading ? (
                      <LoadingSpinner size="small" />
                    ) : (
                      <>
                        <FiSearch size={18} />
                        Buscar Noticias
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

                    <div className="news-grid">
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

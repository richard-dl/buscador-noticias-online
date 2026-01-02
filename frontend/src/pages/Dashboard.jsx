import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { newsApi, userApi } from '../services/api'
import Header from '../components/Header'
import NewsCard from '../components/NewsCard'
import LoadingSpinner from '../components/LoadingSpinner'
import { FiSearch, FiFileText, FiZap, FiClock, FiGrid, FiStar, FiArrowRight, FiTrendingUp } from 'react-icons/fi'
import MediaCarousel from '../components/MediaCarousel'

// Imágenes de fondo para el hero (selección aleatoria)
const HERO_BACKGROUNDS = [
  '/images/newspaper-bg.jpg',
  '/images/world-connections-bg.jpg',
  '/images/media-icons-bg.jpg'
]

const Dashboard = () => {
  const { profile, daysRemaining, isAuthenticated } = useAuth()
  const [recentNews, setRecentNews] = useState([])
  const [searchProfiles, setSearchProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [heroBg] = useState(() =>
    HERO_BACKGROUNDS[Math.floor(Math.random() * HERO_BACKGROUNDS.length)]
  )
  const [gridColumns, setGridColumns] = useState(() => {
    const saved = localStorage.getItem('newsGridColumns')
    return saved ? parseInt(saved, 10) : 3
  })
  const [maxColumns, setMaxColumns] = useState(5)

  const handleColumnChange = (cols) => {
    setGridColumns(cols)
    localStorage.setItem('newsGridColumns', cols.toString())
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  // Detectar viewport para ajustar máximo de columnas
  useEffect(() => {
    const updateMaxColumns = () => {
      const isLandscape = window.matchMedia('(orientation: landscape)').matches
      const width = window.innerWidth

      if (width <= 768 && !isLandscape) {
        setMaxColumns(1)
      } else if (width <= 900 && isLandscape) {
        setMaxColumns(3)
      } else if (width <= 992) {
        setMaxColumns(3)
      } else {
        setMaxColumns(5)
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

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError('')

      // Noticias siempre se cargan (endpoint público)
      // Perfiles solo si está autenticado
      const promises = [
        newsApi.getRecentNews(8)
      ]

      if (isAuthenticated) {
        promises.push(userApi.getSearchProfiles())
      }

      const results = await Promise.allSettled(promises)

      if (results[0].status === 'fulfilled' && results[0].value.success) {
        setRecentNews(results[0].value.data)
      }

      if (isAuthenticated && results[1]?.status === 'fulfilled' && results[1].value.success) {
        setSearchProfiles(results[1].value.data)
      }
    } catch (err) {
      console.error('Error cargando dashboard:', err)
      setError('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dashboard-page">
      <Header />

      {/* Hero Section */}
      <section className="hero" style={{ '--hero-bg-image': `url(${heroBg})` }}>
        <div className="hero-content">
          <div className="hero-text">
            <h1>Buscador de Noticias Online</h1>
            <p className="hero-subtitle">
              Busca, traduce, crea emojis y da formato listo para publicar
            </p>
            {isAuthenticated && (
              <div className="hero-stats">
                <div className="stat">
                  <FiClock size={20} />
                  <span><strong>{daysRemaining ?? '∞'}</strong> días restantes</span>
                </div>
                <div className="stat">
                  <FiFileText size={20} />
                  <span><strong>{searchProfiles.length}</strong> perfiles guardados</span>
                </div>
              </div>
            )}
            <Link to="/generator" className="btn btn-primary btn-large">
              <FiSearch size={20} />
              Comenzar a Buscar
            </Link>
          </div>
          <div className="hero-image">
            <svg viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Globo terráqueo */}
              <circle cx="200" cy="150" r="120" fill="#e2e8f0" stroke="#1a365d" strokeWidth="3"/>
              <ellipse cx="200" cy="150" rx="120" ry="50" fill="none" stroke="#1a365d" strokeWidth="2" opacity="0.5"/>
              <ellipse cx="200" cy="150" rx="50" ry="120" fill="none" stroke="#1a365d" strokeWidth="2" opacity="0.5"/>
              <line x1="80" y1="150" x2="320" y2="150" stroke="#1a365d" strokeWidth="2" opacity="0.5"/>
              <line x1="200" y1="30" x2="200" y2="270" stroke="#1a365d" strokeWidth="2" opacity="0.5"/>

              {/* Lupa */}
              <circle cx="280" cy="200" r="50" fill="none" stroke="#2b6cb0" strokeWidth="8"/>
              <line x1="315" y1="235" x2="360" y2="280" stroke="#2b6cb0" strokeWidth="10" strokeLinecap="round"/>

              {/* Puntos de noticias */}
              <circle cx="150" cy="100" r="15" fill="#48bb78"/>
              <circle cx="150" cy="100" r="7" fill="#fff"/>
              <circle cx="230" cy="80" r="12" fill="#ed8936"/>
              <circle cx="230" cy="80" r="5" fill="#fff"/>
              <circle cx="180" cy="180" r="10" fill="#4299e1"/>
              <circle cx="180" cy="180" r="4" fill="#fff"/>

              {/* Iconos de redes */}
              <rect x="50" y="220" width="40" height="40" rx="8" fill="#1a365d"/>
              <rect x="100" y="230" width="35" height="35" rx="6" fill="#2b6cb0"/>
            </svg>
          </div>
        </div>
      </section>

      {/* Media Carousel */}
      <MediaCarousel />

      {/* Quick Actions */}
      <section className="quick-actions container">
        <div className="actions-grid">
          <Link to="/generator" className="action-card action-card-search">
            <div className="action-icon action-icon-search">
              <FiSearch size={32} />
            </div>
            <h3>Buscar Noticias</h3>
            <p>Busca por temática, provincia o palabras clave</p>
          </Link>

          <Link to={isAuthenticated ? "/generator?tab=breaking" : "/subscription"} className="action-card action-card-breaking">
            <div className="action-icon action-icon-breaking">
              <FiZap size={32} />
            </div>
            <h3>Último Momento</h3>
            <p>{isAuthenticated ? "Noticias recientes de último momento" : "Suscríbete para acceder"}</p>
            <span className="breaking-badge">{isAuthenticated ? "URGENTE" : "PREMIUM"}</span>
          </Link>

          <Link to="/generator?tab=profiles" className="action-card action-card-profiles">
            <div className="action-icon action-icon-profiles">
              <FiFileText size={32} />
            </div>
            <h3>Mis Perfiles</h3>
            <p>Usa tus perfiles de búsqueda guardados</p>
          </Link>

          <Link to={isAuthenticated ? "/zona-vip" : "/subscription"} className="action-card action-card-vip">
            <div className="action-icon action-icon-vip">
              <FiStar size={32} />
            </div>
            <h3>Zona PRENSA</h3>
            <p>{isAuthenticated ? "Contenido exclusivo para suscriptores ZP" : "Suscríbete para acceder"}</p>
            <span className="vip-badge-small">ZP</span>
          </Link>
        </div>
      </section>

      {/* Recent News */}
      <section className="recent-news container">
        <div className="section-header">
          <h2>Noticias Recientes</h2>
          <Link to="/generator" className="btn btn-text">Ver más</Link>
        </div>

        {loading ? (
          <div className="loading-section">
            <LoadingSpinner size="medium" text="Cargando noticias..." />
          </div>
        ) : error ? (
          <div className="error-section">
            <p>{error}</p>
            <button onClick={loadDashboardData} className="btn btn-secondary">
              Reintentar
            </button>
          </div>
        ) : recentNews.length === 0 ? (
          <div className="empty-section">
            <p>No hay noticias disponibles</p>
          </div>
        ) : (
          <>
            <div className="results-header dashboard-results-header">
              <span>{recentNews.length} noticias recientes</span>
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
              {recentNews.map((news, index) => (
                <NewsCard key={index} news={news} />
              ))}
              {/* Card promocional "Ver más" */}
              <Link to="/generator" className="news-card promo-card">
                <div className="promo-card-content">
                  <div className="promo-icon">
                    <FiTrendingUp size={48} />
                  </div>
                  <h3>Descubre más noticias</h3>
                  <p>Accede a cientos de fuentes de medios argentinos e internacionales</p>
                  <div className="promo-features">
                    <span>Filtros avanzados</span>
                    <span>Traducción automática</span>
                    <span>Formato para redes</span>
                  </div>
                  <div className="promo-cta">
                    <span>Explorar ahora</span>
                    <FiArrowRight size={20} />
                  </div>
                </div>
              </Link>
            </div>
          </>
        )}

        {/* CTA para usuarios no autenticados */}
        {!isAuthenticated && (
          <div className="guest-cta-section">
            <p className="guest-cta-message">
              Regístrate o inicia sesión para acceder a todas las funciones
            </p>
            <div className="guest-cta-buttons">
              <Link to="/register" className="btn btn-primary btn-cta-small">
                Registrarse Gratis
              </Link>
              <Link to="/login" className="btn btn-secondary btn-cta-small">
                Iniciar Sesión
              </Link>
            </div>
          </div>
        )}
      </section>


      {/* Footer */}
      <footer className="dashboard-footer">
        <p>Buscador de Noticias Online &copy; {new Date().getFullYear()}</p>
        <span className="version-tag">V01.12.25</span>
      </footer>
    </div>
  )
}

export default Dashboard

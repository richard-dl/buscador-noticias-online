import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { newsApi, userApi } from '../services/api'
import Header from '../components/Header'
import NewsCard from '../components/NewsCard'
import LoadingSpinner from '../components/LoadingSpinner'
import { FiSearch, FiFileText, FiTrendingUp, FiClock } from 'react-icons/fi'

const Dashboard = () => {
  const { profile, daysRemaining } = useAuth()
  const [recentNews, setRecentNews] = useState([])
  const [searchProfiles, setSearchProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError('')

      // Cargar noticias recientes y perfiles en paralelo
      const [newsResponse, profilesResponse] = await Promise.allSettled([
        newsApi.getRssNews({ categories: 'nacionales', maxItems: 6 }),
        userApi.getSearchProfiles()
      ])

      if (newsResponse.status === 'fulfilled' && newsResponse.value.success) {
        setRecentNews(newsResponse.value.data)
      }

      if (profilesResponse.status === 'fulfilled' && profilesResponse.value.success) {
        setSearchProfiles(profilesResponse.value.data)
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
      <section className="hero">
        <div className="hero-content">
          <div className="hero-text">
            <h1>Buscador de Noticias Online</h1>
            <p className="hero-subtitle">
              Busca, traduce, crea emojis y da formato listo para publicar
            </p>
            <div className="hero-stats">
              <div className="stat">
                <FiClock size={20} />
                <span><strong>{daysRemaining}</strong> días restantes</span>
              </div>
              <div className="stat">
                <FiFileText size={20} />
                <span><strong>{searchProfiles.length}</strong> perfiles guardados</span>
              </div>
            </div>
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

      {/* Quick Actions */}
      <section className="quick-actions container">
        <div className="actions-grid">
          <Link to="/generator" className="action-card">
            <div className="action-icon">
              <FiSearch size={32} />
            </div>
            <h3>Buscar Noticias</h3>
            <p>Busca por temática, provincia o palabras clave</p>
          </Link>

          <Link to="/generator?tab=profiles" className="action-card">
            <div className="action-icon">
              <FiFileText size={32} />
            </div>
            <h3>Mis Perfiles</h3>
            <p>Usa tus perfiles de búsqueda guardados</p>
          </Link>

          <Link to="/profile" className="action-card">
            <div className="action-icon">
              <FiTrendingUp size={32} />
            </div>
            <h3>Mi Cuenta</h3>
            <p>Ver suscripción y configuración</p>
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
          <div className="news-grid">
            {recentNews.map((news, index) => (
              <NewsCard key={index} news={news} />
            ))}
          </div>
        )}
      </section>

      {/* Saved Profiles */}
      {searchProfiles.length > 0 && (
        <section className="saved-profiles container">
          <div className="section-header">
            <h2>Tus Perfiles de Búsqueda</h2>
            <Link to="/generator?tab=profiles" className="btn btn-text">Administrar</Link>
          </div>

          <div className="profiles-grid">
            {searchProfiles.slice(0, 4).map(profile => (
              <Link
                key={profile.id}
                to={`/generator?profile=${profile.id}`}
                className="profile-card"
              >
                <h4>{profile.name}</h4>
                <div className="profile-tags">
                  {profile.tematicas?.slice(0, 2).map(t => (
                    <span key={t} className="tag">{t}</span>
                  ))}
                  {profile.provincia && (
                    <span className="tag location">{profile.provincia}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="dashboard-footer">
        <p>Buscador de Noticias Online &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  )
}

export default Dashboard

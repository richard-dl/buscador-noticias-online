import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { userApi, authApi } from '../services/api'
import Header from '../components/Header'
import LoadingSpinner from '../components/LoadingSpinner'
import NewsCard from '../components/NewsCard'
import { toast } from 'react-toastify'
import {
  FiUser, FiMail, FiCalendar, FiClock, FiEdit2, FiSave, FiX, FiUsers, FiBookmark
} from 'react-icons/fi'

const Profile = () => {
  const { profile, refreshProfile, daysRemaining } = useAuth()
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)
  const [searchProfiles, setSearchProfiles] = useState([])
  const [loadingProfiles, setLoadingProfiles] = useState(true)
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [savedNews, setSavedNews] = useState([])
  const [loadingSavedNews, setLoadingSavedNews] = useState(true)

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '')
      // Cargar usuarios solo si es admin
      if (profile.role === 'admin') {
        loadUsers()
      }
    }
    loadSearchProfiles()
    loadSavedNews()
  }, [profile])

  const loadSearchProfiles = async () => {
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

  const loadSavedNews = async () => {
    try {
      const response = await userApi.getSavedNews()
      if (response.success) {
        setSavedNews(response.data)
      }
    } catch (error) {
      console.error('Error cargando noticias guardadas:', error)
    } finally {
      setLoadingSavedNews(false)
    }
  }

  const handleDeleteSavedNews = (newsId) => {
    setSavedNews(prev => prev.filter(n => n.id !== newsId))
  }

  const loadUsers = async () => {
    try {
      const response = await authApi.getAllUsers()
      if (response.success) {
        setUsers(response.data)
      }
    } catch (error) {
      console.error('Error cargando usuarios:', error)
      toast.error('Error al cargar usuarios')
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await userApi.updateProfile({ displayName })
      await refreshProfile()
      setEditing(false)
      toast.success('Perfil actualizado')
    } catch (error) {
      toast.error('Error al actualizar perfil')
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const getStatusBadge = () => {
    const role = profile?.role || profile?.subscription?.status
    const badges = {
      trial: { text: 'Prueba Gratuita', class: 'badge-trial' },
      suscriptor: { text: 'Suscriptor Vitalicio', class: 'badge-active' },
      vip_trial: { text: 'VIP Trial', class: 'badge-vip-trial' },
      vip: { text: 'VIP Anual', class: 'badge-vip' },
      admin: { text: 'Administrador', class: 'badge-admin' },
      active: { text: 'Activo', class: 'badge-active' },
      expired: { text: 'Expirado', class: 'badge-expired' }
    }
    return badges[role] || badges.trial
  }

  const getRoleBadge = (role) => {
    const badges = {
      trial: { text: 'Trial', class: 'badge-trial' },
      suscriptor: { text: 'Suscriptor', class: 'badge-active' },
      vip_trial: { text: 'VIP Trial', class: 'badge-vip-trial' },
      vip: { text: 'VIP', class: 'badge-vip' },
      admin: { text: 'Admin', class: 'badge-admin' }
    }
    return badges[role] || badges.trial
  }

  const getSubscriptionDescription = () => {
    const role = profile?.role
    if (role === 'admin') return null
    if (role === 'suscriptor') return 'Suscripción vitalicia - sin fecha de vencimiento'
    if (role === 'vip_trial') return 'Período de prueba VIP con acceso a IA'
    if (role === 'vip') return 'Suscripción VIP anual con acceso a IA'
    return 'Período de prueba gratuito'
  }

  if (!profile) {
    return (
      <div className="profile-page">
        <Header />
        <main className="profile-main container">
          <LoadingSpinner size="large" text="Cargando perfil..." />
        </main>
      </div>
    )
  }

  const statusBadge = getStatusBadge()

  return (
    <div className="profile-page">
      <Header />

      <main className="profile-main container">
        <h1>Mi Perfil</h1>

        <div className="profile-grid">
          {/* Información del usuario */}
          <section className="profile-card">
            <div className="card-header">
              <h2>Información Personal</h2>
              {!editing ? (
                <button className="btn btn-text" onClick={() => setEditing(true)}>
                  <FiEdit2 size={16} />
                  Editar
                </button>
              ) : (
                <div className="edit-actions">
                  <button
                    className="btn btn-text"
                    onClick={() => {
                      setEditing(false)
                      setDisplayName(profile.displayName || '')
                    }}
                  >
                    <FiX size={16} />
                    Cancelar
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? <LoadingSpinner size="small" /> : <FiSave size={16} />}
                    Guardar
                  </button>
                </div>
              )}
            </div>

            <div className="profile-info">
              <div className="info-row">
                <FiUser size={20} />
                <div className="info-content">
                  <label>Nombre</label>
                  {editing ? (
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Tu nombre"
                    />
                  ) : (
                    <span>{profile.displayName || 'Sin nombre'}</span>
                  )}
                </div>
              </div>

              <div className="info-row">
                <FiMail size={20} />
                <div className="info-content">
                  <label>Email</label>
                  <span>{profile.email}</span>
                </div>
              </div>

              <div className="info-row">
                <FiCalendar size={20} />
                <div className="info-content">
                  <label>Miembro desde</label>
                  <span>{formatDate(profile.createdAt)}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Suscripción */}
          <section className="profile-card subscription-card">
            <div className="card-header">
              <h2>Suscripción</h2>
              {profile?.role === 'admin' ? (
                <span className="badge badge-admin">
                  👑 Administrador
                </span>
              ) : (
                <span className={`badge ${statusBadge.class}`}>
                  {statusBadge.text}
                </span>
              )}
            </div>

            <div className="subscription-info">
              {profile?.role === 'admin' ? (
                <div className="admin-subscription">
                  <p className="admin-message">
                    Tienes acceso <strong>ilimitado</strong> a todas las funciones de la plataforma.
                  </p>
                </div>
              ) : profile?.role === 'suscriptor' ? (
                <div className="subscription-main">
                  <div className="days-circle days-circle-unlimited">
                    <span className="days-number">∞</span>
                    <span className="days-label">vitalicio</span>
                  </div>
                  <div className="subscription-details">
                    <p>{getSubscriptionDescription()}</p>
                    <p className="expiry-date success-text">
                      <FiClock size={16} />
                      Sin fecha de vencimiento
                    </p>
                  </div>
                </div>
              ) : (
                <div className="subscription-main">
                  <div className={`days-circle ${daysRemaining <= 7 ? 'days-circle-warning' : ''}`}>
                    <span className="days-number">{daysRemaining}</span>
                    <span className="days-label">días</span>
                  </div>
                  <div className="subscription-details">
                    <p>{getSubscriptionDescription()}</p>
                    {profile.expiresAt && (
                      <p className="expiry-date">
                        <FiClock size={16} />
                        Vence: {formatDate(profile.expiresAt)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Alerta de vencimiento para trial, vip_trial y vip */}
              {profile?.role !== 'admin' && profile?.role !== 'suscriptor' && daysRemaining !== null && daysRemaining <= 7 && (
                <div className={`renewal-notice ${daysRemaining <= 3 ? 'renewal-urgent' : ''}`}>
                  {profile?.role === 'trial' ? (
                    <>
                      <p>Tu prueba gratuita está por vencer. Activa tu suscripción para continuar.</p>
                      <a href="/subscription" className="btn btn-primary">
                        Ver Planes
                      </a>
                    </>
                  ) : profile?.role === 'vip_trial' ? (
                    <>
                      <p>Tu prueba VIP está por vencer. Activa VIP anual para mantener acceso a IA.</p>
                      <a href="/subscription" className="btn btn-primary">
                        Activar VIP
                      </a>
                    </>
                  ) : profile?.role === 'vip' ? (
                    <>
                      <p>Tu suscripción VIP está por vencer. Renueva para mantener acceso a IA.</p>
                      <a href="/subscription" className="btn btn-primary">
                        Renovar VIP
                      </a>
                    </>
                  ) : null}
                </div>
              )}
            </div>
          </section>

          {/* Perfiles de búsqueda */}
          <section className="profile-card profiles-card">
            <div className="card-header">
              <h2>Perfiles de Búsqueda</h2>
              <span className="count">{searchProfiles.length} / 10</span>
            </div>

            {loadingProfiles ? (
              <LoadingSpinner size="small" text="Cargando..." />
            ) : searchProfiles.length === 0 ? (
              <p className="empty-message">No tienes perfiles de búsqueda guardados</p>
            ) : (
              <ul className="profiles-list">
                {searchProfiles.map(sp => (
                  <li key={sp.id}>
                    <span className="profile-name">{sp.name}</span>
                    <div className="profile-meta">
                      {sp.tematicas?.length > 0 && (
                        <span>{sp.tematicas.length} temáticas</span>
                      )}
                      {sp.provincia && <span>{sp.provincia}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Estadísticas */}
          <section className="profile-card stats-card">
            <div className="card-header">
              <h2>Uso de la Plataforma</h2>
            </div>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-value">{searchProfiles.length}</span>
                <span className="stat-label">Perfiles guardados</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{savedNews.length}</span>
                <span className="stat-label">Noticias guardadas</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{profile.authProvider === 'google' ? 'Google' : 'Email'}</span>
                <span className="stat-label">Método de acceso</span>
              </div>
            </div>
          </section>

          {/* Noticias Guardadas */}
          <section className="profile-card saved-news-card">
            <div className="card-header">
              <h2>
                <FiBookmark size={24} />
                Noticias Guardadas
              </h2>
              <span className="count">{savedNews.length} / 100</span>
            </div>

            {loadingSavedNews ? (
              <LoadingSpinner size="small" text="Cargando noticias..." />
            ) : savedNews.length === 0 ? (
              <p className="empty-message">No tienes noticias guardadas. Usa el botón de guardar en las tarjetas de noticias para agregar noticias aquí.</p>
            ) : (
              <div className="saved-news-grid">
                {savedNews.map(news => (
                  <NewsCard
                    key={news.id}
                    news={news}
                    isSaved={true}
                    savedNewsId={news.id}
                    onDelete={handleDeleteSavedNews}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Sección de usuarios - Solo Admin */}
          {profile?.role === 'admin' && (
            <section className="profile-card users-card users-card-expanded">
              <div className="card-header">
                <h2>
                  <FiUsers size={24} />
                  Usuarios Registrados
                </h2>
                <span className="badge badge-info">
                  {users.length} usuarios
                </span>
              </div>

              {loadingUsers ? (
                <LoadingSpinner />
              ) : (
                <div className="users-grid">
                  {users.map(user => (
                    <div key={user.uid} className="user-card-expanded">
                      <div className="user-card-header">
                        <div className="user-avatar">
                          {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="user-main-info">
                          <h4>{user.displayName || 'Sin nombre'}</h4>
                          <span className="user-email">{user.email}</span>
                        </div>
                        <span className={`badge ${user.role === 'admin' ? 'badge-admin' : 'badge-secondary'}`}>
                          {user.role === 'admin' ? '👑 Admin' : 'Usuario'}
                        </span>
                      </div>

                      <div className="user-card-body">
                        <div className="user-stat">
                          <span className="stat-label">Rol</span>
                          <span className={`badge ${getRoleBadge(user.role).class}`}>
                            {getRoleBadge(user.role).text}
                          </span>
                        </div>

                        <div className="user-stat">
                          <span className="stat-label">Estado</span>
                          <span className={`badge ${user.isExpired ? 'badge-danger' : 'badge-success'}`}>
                            {user.isExpired ? 'Expirado' : 'Activo'}
                          </span>
                        </div>

                        <div className="user-stat">
                          <span className="stat-label">Días restantes</span>
                          {user.role === 'admin' || user.role === 'suscriptor' ? (
                            <span className="text-success">∞ {user.role === 'admin' ? 'Admin' : 'Vitalicio'}</span>
                          ) : (
                            <span className={user.daysRemaining <= 7 ? 'text-danger' : ''}>
                              {user.daysRemaining} días
                            </span>
                          )}
                        </div>

                        <div className="user-stat">
                          <span className="stat-label">Registro</span>
                          <span>
                            {user.createdAt ? new Date(user.createdAt._seconds * 1000).toLocaleDateString('es-AR') : 'N/A'}
                          </span>
                        </div>

                        <div className="user-stat">
                          <span className="stat-label">Último acceso</span>
                          <span>
                            {user.lastLogin
                              ? new Date(user.lastLogin._seconds * 1000).toLocaleString('es-AR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : 'Nunca'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  )
}

export default Profile

import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { userApi, authApi, vipApi, sessionsApi } from '../services/api'
import Header from '../components/Header'
import LoadingSpinner from '../components/LoadingSpinner'
import NewsCard from '../components/NewsCard'
import { toast } from 'react-toastify'
import {
  FiUser, FiMail, FiCalendar, FiClock, FiEdit2, FiSave, FiX, FiUsers, FiBookmark,
  FiStar, FiTrash2, FiRefreshCw, FiDatabase, FiImage, FiVideo, FiFileText, FiLayers,
  FiMonitor, FiSmartphone, FiTablet, FiMapPin, FiLogOut, FiSettings, FiShield,
  FiChevronDown, FiChevronUp
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
  // Estados para admin VIP
  const [vipStats, setVipStats] = useState(null)
  const [loadingVipStats, setLoadingVipStats] = useState(false)
  const [runningCleanup, setRunningCleanup] = useState(false)
  // Estados para sesiones (admin)
  const [sessionUsers, setSessionUsers] = useState([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [sessionActionLoading, setSessionActionLoading] = useState(null)
  const [expandedUsers, setExpandedUsers] = useState({})
  const [sessionFilter, setSessionFilter] = useState('all')

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '')
      // Cargar usuarios, stats VIP y sesiones solo si es admin
      if (profile.role === 'admin') {
        loadUsers()
        loadVipStats()
        loadSessionUsers()
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

  const loadVipStats = async () => {
    try {
      setLoadingVipStats(true)
      const response = await vipApi.getAdminStats()
      if (response.success) {
        setVipStats(response.data)
      }
    } catch (error) {
      console.error('Error cargando estadísticas VIP:', error)
    } finally {
      setLoadingVipStats(false)
    }
  }

  const handleVipCleanup = async () => {
    if (!window.confirm('¿Ejecutar limpieza de contenido VIP antiguo? Esto eliminará los elementos que excedan el límite de 150.')) {
      return
    }

    try {
      setRunningCleanup(true)
      const response = await vipApi.runCleanup()
      if (response.success) {
        toast.success(response.message)
        // Recargar estadísticas
        loadVipStats()
      }
    } catch (error) {
      console.error('Error ejecutando limpieza VIP:', error)
      toast.error('Error al ejecutar limpieza')
    } finally {
      setRunningCleanup(false)
    }
  }

  // ========== Funciones de Sesiones ==========
  const loadSessionUsers = async () => {
    try {
      setLoadingSessions(true)
      const response = await sessionsApi.admin.getAllUsers()
      if (response.success) {
        setSessionUsers(response.data || [])
      }
    } catch (error) {
      console.error('Error cargando sesiones:', error)
    } finally {
      setLoadingSessions(false)
    }
  }

  const toggleUserExpand = (uid) => {
    setExpandedUsers(prev => ({
      ...prev,
      [uid]: !prev[uid]
    }))
  }

  const handleRevokeSession = async (uid, sessionId, userEmail) => {
    if (!window.confirm(`¿Cerrar esta sesión de ${userEmail}?`)) return
    try {
      setSessionActionLoading(`${uid}-${sessionId}`)
      await sessionsApi.admin.revokeUserSession(uid, sessionId)
      toast.success('Sesión cerrada')
      loadSessionUsers()
    } catch (error) {
      toast.error('Error al cerrar sesión')
    } finally {
      setSessionActionLoading(null)
    }
  }

  const handleRevokeAllUserSessions = async (uid, userEmail, sessionCount) => {
    if (!window.confirm(`¿Cerrar las ${sessionCount} sesiones activas de ${userEmail}?`)) return
    try {
      setSessionActionLoading(`${uid}-all`)
      await sessionsApi.admin.revokeAllUserSessions(uid)
      toast.success('Sesiones cerradas')
      loadSessionUsers()
    } catch (error) {
      toast.error('Error al cerrar sesiones')
    } finally {
      setSessionActionLoading(null)
    }
  }

  const handleToggleSingleSession = async (uid, currentValue, userEmail) => {
    try {
      setSessionActionLoading(`${uid}-settings`)
      await sessionsApi.admin.updateUserSettings(uid, { singleSessionMode: !currentValue })
      toast.success(`Modo sesión única ${!currentValue ? 'activado' : 'desactivado'}`)
      loadSessionUsers()
    } catch (error) {
      toast.error('Error al actualizar configuración')
    } finally {
      setSessionActionLoading(null)
    }
  }

  const getDeviceIcon = (deviceType) => {
    switch (deviceType) {
      case 'mobile': return <FiSmartphone size={18} />
      case 'tablet': return <FiTablet size={18} />
      default: return <FiMonitor size={18} />
    }
  }

  const getRelativeTime = (dateString) => {
    if (!dateString) return ''
    const diffMs = new Date() - new Date(dateString)
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffMins < 1) return 'Ahora'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    return `${diffDays}d`
  }

  const getSessionRoleBadge = (role) => {
    const badges = { admin: 'badge-admin', vip: 'badge-vip', vip_trial: 'badge-vip-trial', suscriptor: 'badge-suscriptor', trial: 'badge-trial' }
    return badges[role] || 'badge-trial'
  }

  const getSessionRoleLabel = (role) => {
    const labels = { admin: 'Admin', vip: 'VIP', vip_trial: 'VIP Trial', suscriptor: 'Suscriptor', trial: 'Trial' }
    return labels[role] || role
  }

  const filteredSessionUsers = sessionUsers.filter(user => {
    if (sessionFilter === 'active') return user.activeSessions > 0
    if (sessionFilter === 'inactive') return user.activeSessions === 0
    return true
  })

  const sessionStats = {
    totalUsers: sessionUsers.length,
    usersWithSessions: sessionUsers.filter(u => u.activeSessions > 0).length,
    totalSessions: sessionUsers.reduce((acc, u) => acc + u.activeSessions, 0),
    singleSessionUsers: sessionUsers.filter(u => u.singleSessionMode).length
  }
  // ========== Fin Funciones de Sesiones ==========

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
                  <div className={`days-circle ${daysRemaining !== null && daysRemaining <= 7 ? 'days-circle-warning' : ''}`}>
                    <span className="days-number">{daysRemaining ?? 0}</span>
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
              {profile?.role !== 'admin' && profile?.role !== 'suscriptor' && daysRemaining !== null && daysRemaining !== undefined && daysRemaining <= 7 && (
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

          {/* Sección de Zona VIP - Solo Admin */}
          {profile?.role === 'admin' && (
            <section className="profile-card vip-admin-card">
              <div className="card-header">
                <h2>
                  <FiStar size={24} />
                  Administración Zona VIP
                </h2>
                <button
                  className="btn btn-text"
                  onClick={loadVipStats}
                  disabled={loadingVipStats}
                  title="Actualizar estadísticas"
                >
                  <FiRefreshCw size={16} className={loadingVipStats ? 'spinning' : ''} />
                </button>
              </div>

              {loadingVipStats && !vipStats ? (
                <LoadingSpinner size="small" text="Cargando estadísticas..." />
              ) : vipStats ? (
                <>
                  <div className="vip-stats-grid">
                    <div className="vip-stat-item">
                      <FiDatabase size={20} />
                      <div className="vip-stat-content">
                        <span className="vip-stat-value">{vipStats.totalItems}</span>
                        <span className="vip-stat-label">Total elementos</span>
                      </div>
                    </div>

                    <div className="vip-stat-item">
                      <FiLayers size={20} />
                      <div className="vip-stat-content">
                        <span className="vip-stat-value">{vipStats.uniqueGroups}</span>
                        <span className="vip-stat-label">Grupos únicos</span>
                      </div>
                    </div>

                    <div className="vip-stat-item">
                      <FiImage size={20} />
                      <div className="vip-stat-content">
                        <span className="vip-stat-value">{vipStats.itemsWithImages}</span>
                        <span className="vip-stat-label">Con imágenes</span>
                      </div>
                    </div>

                    <div className="vip-stat-item">
                      <FiVideo size={20} />
                      <div className="vip-stat-content">
                        <span className="vip-stat-value">{vipStats.itemsWithVideos}</span>
                        <span className="vip-stat-label">Con videos</span>
                      </div>
                    </div>

                    <div className="vip-stat-item">
                      <FiFileText size={20} />
                      <div className="vip-stat-content">
                        <span className="vip-stat-value">{vipStats.itemsWithText}</span>
                        <span className="vip-stat-label">Con texto</span>
                      </div>
                    </div>

                    <div className={`vip-stat-item ${vipStats.exceedingLimit > 0 ? 'vip-stat-warning' : ''}`}>
                      <FiTrash2 size={20} />
                      <div className="vip-stat-content">
                        <span className="vip-stat-value">{vipStats.exceedingLimit}</span>
                        <span className="vip-stat-label">Exceden límite</span>
                      </div>
                    </div>
                  </div>

                  <div className="vip-limit-bar">
                    <div className="vip-limit-info">
                      <span>Uso: {vipStats.totalItems} / {vipStats.limit}</span>
                      <span className={vipStats.exceedingLimit > 0 ? 'text-warning' : 'text-success'}>
                        {vipStats.exceedingLimit > 0
                          ? `${vipStats.exceedingLimit} elementos para limpiar`
                          : 'Dentro del límite'}
                      </span>
                    </div>
                    <div className="vip-progress-bar">
                      <div
                        className={`vip-progress-fill ${vipStats.totalItems > vipStats.limit ? 'vip-progress-exceeded' : ''}`}
                        style={{ width: `${Math.min(100, (vipStats.totalItems / vipStats.limit) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="vip-admin-actions">
                    <button
                      className="btn btn-danger"
                      onClick={handleVipCleanup}
                      disabled={runningCleanup || vipStats.exceedingLimit === 0}
                    >
                      {runningCleanup ? (
                        <>
                          <FiRefreshCw size={16} className="spinning" />
                          Limpiando...
                        </>
                      ) : (
                        <>
                          <FiTrash2 size={16} />
                          Limpiar contenido antiguo
                        </>
                      )}
                    </button>
                    {vipStats.exceedingLimit === 0 && (
                      <span className="vip-cleanup-hint">No hay elementos para limpiar</span>
                    )}
                  </div>
                </>
              ) : (
                <p className="empty-message">No se pudieron cargar las estadísticas</p>
              )}
            </section>
          )}

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
                          <div className="status-bar-container">
                            <div
                              className={`status-bar ${user.isExpired ? 'status-expired' : 'status-active'}`}
                              style={{
                                '--status-percent': user.isExpired ? '0%' :
                                  user.role === 'admin' || user.role === 'suscriptor' ? '100%' :
                                  `${Math.min(100, Math.max(0, (user.daysRemaining / 30) * 100))}%`
                              }}
                            />
                            <span className="status-bar-label">
                              {user.isExpired ? 'Expirado' : 'Activo'}
                            </span>
                          </div>
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

          {/* Sección de Sesiones - Solo Admin */}
          {profile?.role === 'admin' && (
            <section className="profile-card sessions-admin-card">
              <div className="card-header">
                <h2>
                  <FiShield size={24} />
                  Control de Sesiones
                </h2>
                <button
                  className="btn btn-text"
                  onClick={loadSessionUsers}
                  disabled={loadingSessions}
                  title="Actualizar"
                >
                  <FiRefreshCw size={16} className={loadingSessions ? 'spinning' : ''} />
                </button>
              </div>

              {/* Stats de sesiones */}
              <div className="sessions-stats-mini">
                <div className="stat-mini">
                  <span className="stat-value">{sessionStats.totalUsers}</span>
                  <span className="stat-label">Usuarios</span>
                </div>
                <div className="stat-mini">
                  <span className="stat-value">{sessionStats.usersWithSessions}</span>
                  <span className="stat-label">Con sesiones</span>
                </div>
                <div className="stat-mini">
                  <span className="stat-value">{sessionStats.totalSessions}</span>
                  <span className="stat-label">Sesiones activas</span>
                </div>
                <div className="stat-mini">
                  <span className="stat-value">{sessionStats.singleSessionUsers}</span>
                  <span className="stat-label">Sesión única</span>
                </div>
              </div>

              {/* Filtros */}
              <div className="sessions-filter-tabs">
                <button
                  className={`filter-tab ${sessionFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setSessionFilter('all')}
                >
                  Todos ({sessionUsers.length})
                </button>
                <button
                  className={`filter-tab ${sessionFilter === 'active' ? 'active' : ''}`}
                  onClick={() => setSessionFilter('active')}
                >
                  Con sesiones ({sessionStats.usersWithSessions})
                </button>
                <button
                  className={`filter-tab ${sessionFilter === 'inactive' ? 'active' : ''}`}
                  onClick={() => setSessionFilter('inactive')}
                >
                  Sin sesiones ({sessionUsers.length - sessionStats.usersWithSessions})
                </button>
              </div>

              {loadingSessions ? (
                <LoadingSpinner size="small" text="Cargando sesiones..." />
              ) : filteredSessionUsers.length === 0 ? (
                <p className="empty-message">No hay usuarios que mostrar</p>
              ) : (
                <div className="sessions-users-list">
                  {filteredSessionUsers.map(user => (
                    <div key={user.uid} className="session-user-card">
                      <div
                        className="session-user-header"
                        onClick={() => toggleUserExpand(user.uid)}
                      >
                        <div className="session-user-info">
                          <FiUser size={18} />
                          <div className="session-user-details">
                            <span className="session-user-email">{user.email}</span>
                            <div className="session-user-meta">
                              <span className={`badge badge-sm ${getSessionRoleBadge(user.role)}`}>
                                {getSessionRoleLabel(user.role)}
                              </span>
                              <span className="sessions-count-badge">
                                {user.activeSessions} sesión(es)
                              </span>
                              {user.singleSessionMode && (
                                <span className="badge badge-sm badge-info">Única</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="session-user-actions">
                          {user.activeSessions > 0 && (
                            <button
                              className="btn btn-xs btn-outline-danger"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRevokeAllUserSessions(user.uid, user.email, user.activeSessions)
                              }}
                              disabled={sessionActionLoading === `${user.uid}-all`}
                              title="Cerrar todas"
                            >
                              {sessionActionLoading === `${user.uid}-all` ? (
                                <LoadingSpinner size="small" />
                              ) : (
                                <FiLogOut size={12} />
                              )}
                            </button>
                          )}
                          <button
                            className={`btn btn-xs ${user.singleSessionMode ? 'btn-success' : 'btn-outline'}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleToggleSingleSession(user.uid, user.singleSessionMode, user.email)
                            }}
                            disabled={sessionActionLoading === `${user.uid}-settings`}
                            title={user.singleSessionMode ? 'Desactivar única' : 'Activar única'}
                          >
                            {sessionActionLoading === `${user.uid}-settings` ? (
                              <LoadingSpinner size="small" />
                            ) : (
                              <FiSettings size={12} />
                            )}
                          </button>
                          {expandedUsers[user.uid] ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                        </div>
                      </div>

                      {expandedUsers[user.uid] && user.sessions.length > 0 && (
                        <div className="session-user-sessions">
                          {user.sessions.map(session => (
                            <div key={session.id} className="session-item-mini">
                              <div className="session-device-icon">
                                {getDeviceIcon(session.deviceInfo?.deviceType)}
                              </div>
                              <div className="session-item-details">
                                <span className="session-browser">
                                  {session.deviceInfo?.browser || 'Navegador'} - {session.deviceInfo?.os || 'Sistema'}
                                </span>
                                <div className="session-item-meta">
                                  <span><FiMapPin size={10} /> {session.ipInfo?.city || 'Ubicación'}</span>
                                  <span><FiClock size={10} /> {getRelativeTime(session.lastActivity)}</span>
                                </div>
                              </div>
                              <button
                                className="btn btn-icon-sm btn-danger-ghost"
                                onClick={() => handleRevokeSession(user.uid, session.id, user.email)}
                                disabled={sessionActionLoading === `${user.uid}-${session.id}`}
                              >
                                {sessionActionLoading === `${user.uid}-${session.id}` ? (
                                  <LoadingSpinner size="small" />
                                ) : (
                                  <FiTrash2 size={14} />
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {expandedUsers[user.uid] && user.sessions.length === 0 && (
                        <div className="session-user-sessions">
                          <p className="no-sessions-mini">Sin sesiones activas</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="sessions-info-mini">
                <p><strong>Info:</strong> Trial: 2 dispositivos | Suscriptor/VIP: 3 | Admin: 10</p>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}

export default Profile

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { sessionsApi } from '../services/api'
import Header from '../components/Header'
import LoadingSpinner from '../components/LoadingSpinner'
import { toast } from 'react-toastify'
import {
  FiMonitor, FiSmartphone, FiTablet, FiClock, FiMapPin,
  FiTrash2, FiLogOut, FiSettings, FiShield, FiRefreshCw,
  FiUser, FiChevronDown, FiChevronUp, FiUsers
} from 'react-icons/fi'
import '../styles/sessions.css'

const Sessions = () => {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [expandedUsers, setExpandedUsers] = useState({})
  const [filter, setFilter] = useState('all') // all, active, inactive

  // Verificar que es superadmin
  useEffect(() => {
    if (profile && profile.role !== 'superadmin') {
      toast.error('Acceso denegado')
      navigate('/dashboard')
    }
  }, [profile, navigate])

  useEffect(() => {
    if (profile?.role === 'superadmin') {
      loadUsers()
    }
  }, [profile])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const response = await sessionsApi.admin.getAllUsers()
      if (response.success) {
        setUsers(response.data || [])
      }
    } catch (error) {
      console.error('Error cargando usuarios:', error)
      toast.error('Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  const toggleUserExpand = (uid) => {
    setExpandedUsers(prev => ({
      ...prev,
      [uid]: !prev[uid]
    }))
  }

  const handleRevokeSession = async (uid, sessionId, userEmail) => {
    if (!window.confirm(`¿Cerrar esta sesión de ${userEmail}?`)) {
      return
    }

    try {
      setActionLoading(`${uid}-${sessionId}`)
      await sessionsApi.admin.revokeUserSession(uid, sessionId)
      toast.success('Sesión cerrada')
      loadUsers()
    } catch (error) {
      console.error('Error cerrando sesión:', error)
      toast.error('Error al cerrar sesión')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRevokeAllUserSessions = async (uid, userEmail, sessionCount) => {
    if (!window.confirm(`¿Cerrar las ${sessionCount} sesiones activas de ${userEmail}?`)) {
      return
    }

    try {
      setActionLoading(`${uid}-all`)
      const response = await sessionsApi.admin.revokeAllUserSessions(uid)
      toast.success(response.message || 'Sesiones cerradas')
      loadUsers()
    } catch (error) {
      console.error('Error cerrando sesiones:', error)
      toast.error('Error al cerrar sesiones')
    } finally {
      setActionLoading(null)
    }
  }

  const handleToggleSingleSession = async (uid, currentValue, userEmail) => {
    try {
      setActionLoading(`${uid}-settings`)
      const newValue = !currentValue
      await sessionsApi.admin.updateUserSettings(uid, { singleSessionMode: newValue })
      toast.success(`Modo sesión única ${newValue ? 'activado' : 'desactivado'} para ${userEmail}`)
      loadUsers()
    } catch (error) {
      console.error('Error actualizando configuración:', error)
      toast.error('Error al actualizar configuración')
    } finally {
      setActionLoading(null)
    }
  }

  const getDeviceIcon = (deviceType) => {
    switch (deviceType) {
      case 'mobile': return <FiSmartphone size={18} />
      case 'tablet': return <FiTablet size={18} />
      default: return <FiMonitor size={18} />
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Desconocido'
    return new Date(dateString).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getRelativeTime = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Ahora'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    return `${diffDays}d`
  }

  const getRoleBadge = (role) => {
    const badges = {
      superadmin: 'badge-superadmin',
      admin: 'badge-admin',
      vip: 'badge-vip',
      vip_trial: 'badge-vip-trial',
      suscriptor: 'badge-suscriptor',
      trial: 'badge-trial'
    }
    return badges[role] || 'badge-trial'
  }

  const getRoleLabel = (role) => {
    const labels = {
      superadmin: 'Super Admin',
      admin: 'Admin',
      vip: 'VIP',
      vip_trial: 'VIP Trial',
      suscriptor: 'Suscriptor',
      trial: 'Trial'
    }
    return labels[role] || role
  }

  // Filtrar usuarios
  const filteredUsers = users.filter(user => {
    if (filter === 'active') return user.activeSessions > 0
    if (filter === 'inactive') return user.activeSessions === 0
    return true
  })

  // Estadísticas
  const stats = {
    totalUsers: users.length,
    usersWithSessions: users.filter(u => u.activeSessions > 0).length,
    totalSessions: users.reduce((acc, u) => acc + u.activeSessions, 0),
    singleSessionUsers: users.filter(u => u.singleSessionMode).length
  }

  if (!profile || profile.role !== 'superadmin') {
    return null
  }

  if (loading) {
    return (
      <div className="sessions-page">
        <Header />
        <main className="sessions-main container">
          <LoadingSpinner size="large" text="Cargando usuarios..." />
        </main>
      </div>
    )
  }

  return (
    <div className="sessions-page">
      <Header />

      <main className="sessions-main container">
        <div className="sessions-header">
          <h1>
            <FiShield size={28} />
            Panel de Sesiones
          </h1>
          <p className="sessions-subtitle">
            Administra las sesiones activas de todos los usuarios
          </p>
        </div>

        {/* Estadísticas */}
        <section className="sessions-stats">
          <div className="stat-card">
            <FiUsers size={24} />
            <div className="stat-info">
              <span className="stat-value">{stats.totalUsers}</span>
              <span className="stat-label">Usuarios totales</span>
            </div>
          </div>
          <div className="stat-card">
            <FiUser size={24} />
            <div className="stat-info">
              <span className="stat-value">{stats.usersWithSessions}</span>
              <span className="stat-label">Con sesiones activas</span>
            </div>
          </div>
          <div className="stat-card">
            <FiMonitor size={24} />
            <div className="stat-info">
              <span className="stat-value">{stats.totalSessions}</span>
              <span className="stat-label">Sesiones totales</span>
            </div>
          </div>
          <div className="stat-card">
            <FiShield size={24} />
            <div className="stat-info">
              <span className="stat-value">{stats.singleSessionUsers}</span>
              <span className="stat-label">Modo sesión única</span>
            </div>
          </div>
        </section>

        {/* Filtros y acciones */}
        <section className="sessions-card">
          <div className="card-header sessions-list-header">
            <div className="filter-tabs">
              <button
                className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                Todos ({users.length})
              </button>
              <button
                className={`filter-tab ${filter === 'active' ? 'active' : ''}`}
                onClick={() => setFilter('active')}
              >
                Con sesiones ({stats.usersWithSessions})
              </button>
              <button
                className={`filter-tab ${filter === 'inactive' ? 'active' : ''}`}
                onClick={() => setFilter('inactive')}
              >
                Sin sesiones ({users.length - stats.usersWithSessions})
              </button>
            </div>
            <button
              className="btn btn-ghost"
              onClick={loadUsers}
              disabled={loading}
              title="Actualizar lista"
            >
              <FiRefreshCw size={18} />
            </button>
          </div>

          {/* Lista de usuarios */}
          {filteredUsers.length === 0 ? (
            <p className="empty-message">No hay usuarios que mostrar</p>
          ) : (
            <div className="users-list">
              {filteredUsers.map(user => (
                <div key={user.uid} className="user-card">
                  <div
                    className="user-header"
                    onClick={() => toggleUserExpand(user.uid)}
                  >
                    <div className="user-info">
                      <FiUser size={20} />
                      <div className="user-details">
                        <span className="user-email">{user.email}</span>
                        <div className="user-meta">
                          <span className={`badge ${getRoleBadge(user.role)}`}>
                            {getRoleLabel(user.role)}
                          </span>
                          <span className="sessions-count">
                            {user.activeSessions} sesión(es) activa(s)
                          </span>
                          {user.singleSessionMode && (
                            <span className="badge badge-info">Sesión única</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="user-actions">
                      {user.activeSessions > 0 && (
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRevokeAllUserSessions(user.uid, user.email, user.activeSessions)
                          }}
                          disabled={actionLoading === `${user.uid}-all`}
                          title="Cerrar todas las sesiones"
                        >
                          {actionLoading === `${user.uid}-all` ? (
                            <LoadingSpinner size="small" />
                          ) : (
                            <>
                              <FiLogOut size={14} />
                              Cerrar todas
                            </>
                          )}
                        </button>
                      )}
                      <button
                        className={`btn btn-sm ${user.singleSessionMode ? 'btn-success' : 'btn-outline'}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleSingleSession(user.uid, user.singleSessionMode, user.email)
                        }}
                        disabled={actionLoading === `${user.uid}-settings`}
                        title={user.singleSessionMode ? 'Desactivar sesión única' : 'Activar sesión única'}
                      >
                        {actionLoading === `${user.uid}-settings` ? (
                          <LoadingSpinner size="small" />
                        ) : (
                          <>
                            <FiSettings size={14} />
                            {user.singleSessionMode ? 'Única ON' : 'Única OFF'}
                          </>
                        )}
                      </button>
                      {expandedUsers[user.uid] ? (
                        <FiChevronUp size={20} />
                      ) : (
                        <FiChevronDown size={20} />
                      )}
                    </div>
                  </div>

                  {/* Sesiones expandidas */}
                  {expandedUsers[user.uid] && user.sessions.length > 0 && (
                    <div className="user-sessions">
                      {user.sessions.map(session => (
                        <div key={session.id} className="session-item">
                          <div className="session-device-icon">
                            {getDeviceIcon(session.deviceInfo?.deviceType)}
                          </div>
                          <div className="session-details">
                            <span className="session-browser">
                              {session.deviceInfo?.browser || 'Navegador'} en {session.deviceInfo?.os || 'Sistema'}
                            </span>
                            <div className="session-meta">
                              <span>
                                <FiMapPin size={12} />
                                {session.ipInfo?.city || 'Ubicación desconocida'}
                                {session.ipInfo?.country && `, ${session.ipInfo.country}`}
                              </span>
                              <span>
                                <FiClock size={12} />
                                {getRelativeTime(session.lastActivity)}
                              </span>
                              <span className="session-ip">IP: {session.ip || 'N/A'}</span>
                            </div>
                            <span className="session-date">
                              Inicio: {formatDate(session.createdAt)}
                            </span>
                          </div>
                          <button
                            className="btn btn-icon btn-danger-ghost"
                            onClick={() => handleRevokeSession(user.uid, session.id, user.email)}
                            disabled={actionLoading === `${user.uid}-${session.id}`}
                            title="Cerrar sesión"
                          >
                            {actionLoading === `${user.uid}-${session.id}` ? (
                              <LoadingSpinner size="small" />
                            ) : (
                              <FiTrash2 size={16} />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {expandedUsers[user.uid] && user.sessions.length === 0 && (
                    <div className="user-sessions">
                      <p className="no-sessions">Este usuario no tiene sesiones activas</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Información */}
        <section className="sessions-card sessions-info">
          <h3>Información del sistema</h3>
          <ul>
            <li>Las sesiones expiran automáticamente después de 30 días de inactividad</li>
            <li>El modo "sesión única" cierra las sesiones anteriores al iniciar una nueva</li>
            <li>Usuarios trial: máximo 2 dispositivos / Suscriptor, VIP y Admin: máximo 3 / Super Admin: máximo 10</li>
            <li>Al cerrar una sesión, el usuario deberá iniciar sesión nuevamente en ese dispositivo</li>
          </ul>
        </section>
      </main>
    </div>
  )
}

export default Sessions

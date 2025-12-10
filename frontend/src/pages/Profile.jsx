import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { userApi, authApi } from '../services/api'
import Header from '../components/Header'
import LoadingSpinner from '../components/LoadingSpinner'
import { toast } from 'react-toastify'
import {
  FiUser, FiMail, FiCalendar, FiClock, FiEdit2, FiSave, FiX, FiUsers
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

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '')
      // Cargar usuarios solo si es admin
      if (profile.role === 'admin') {
        loadUsers()
      }
    }
    loadSearchProfiles()
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
    const status = profile?.subscription?.status
    const badges = {
      trial: { text: 'Prueba Gratuita', class: 'badge-trial' },
      active: { text: 'Activo', class: 'badge-active' },
      expired: { text: 'Expirado', class: 'badge-expired' }
    }
    return badges[status] || badges.trial
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
                    🎉 Tienes acceso <strong>ilimitado</strong> a todas las funciones de la plataforma.
                  </p>
                </div>
              ) : (
                <div className="subscription-main">
                  <div className="days-circle">
                    <span className="days-number">{daysRemaining}</span>
                    <span className="days-label">días</span>
                  </div>
                  <div className="subscription-details">
                    <p>Días restantes de tu suscripción</p>
                    {profile.subscription?.expiresAt && (
                      <p className="expiry-date">
                        <FiClock size={16} />
                        Vence: {formatDate(profile.subscription.expiresAt)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {!profile?.role || profile?.role !== 'admin' && daysRemaining <= 7 && (
                <div className="renewal-notice">
                  <p>Tu suscripción está por vencer. Contacta al administrador para renovar.</p>
                  <a
                    href="mailto:soporte@tuplay.top?subject=Renovación de suscripción"
                    className="btn btn-primary"
                  >
                    Contactar para Renovar
                  </a>
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
                <span className="stat-value">{profile.authProvider === 'google' ? 'Google' : 'Email'}</span>
                <span className="stat-label">Método de acceso</span>
              </div>
            </div>
          </section>

          {/* Sección de usuarios - Solo Admin */}
          {profile?.role === 'admin' && (
            <section className="profile-card users-card">
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
                <div className="users-table-container">
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th>Usuario</th>
                        <th>Email</th>
                        <th>Rol</th>
                        <th>Estado</th>
                        <th>Días restantes</th>
                        <th>Fecha de registro</th>
                        <th>Último acceso</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(user => (
                        <tr key={user.uid}>
                          <td>
                            <strong>{user.displayName}</strong>
                          </td>
                          <td>{user.email}</td>
                          <td>
                            <span className={`badge ${user.role === 'admin' ? 'badge-admin' : 'badge-secondary'}`}>
                              {user.role === 'admin' ? '👑 Admin' : 'Usuario'}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${user.isExpired ? 'badge-danger' : 'badge-success'}`}>
                              {user.isExpired ? 'Expirado' : 'Activo'}
                            </span>
                          </td>
                          <td>
                            {user.role === 'admin' ? (
                              <span className="text-success">Ilimitado</span>
                            ) : (
                              <span className={user.daysRemaining <= 7 ? 'text-danger' : ''}>
                                {user.daysRemaining} días
                              </span>
                            )}
                          </td>
                          <td>
                            {user.createdAt ? new Date(user.createdAt._seconds * 1000).toLocaleDateString('es-AR') : 'N/A'}
                          </td>
                          <td>
                            {user.lastLogin ? new Date(user.lastLogin._seconds * 1000).toLocaleDateString('es-AR') : 'Nunca'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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

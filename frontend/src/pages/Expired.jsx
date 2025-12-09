import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FiAlertCircle, FiMail, FiLogOut } from 'react-icons/fi'

const Expired = () => {
  const { user, logout, profile } = useAuth()

  return (
    <div className="expired-page">
      <div className="expired-container">
        <div className="expired-icon">
          <FiAlertCircle size={80} />
        </div>

        <h1>Suscripción Expirada</h1>

        <p className="expired-message">
          Tu período de prueba de 30 días ha finalizado.
          Para continuar usando el Buscador de Noticias Online,
          contacta con el administrador para renovar tu suscripción.
        </p>

        <div className="expired-info">
          <p><strong>Cuenta:</strong> {user?.email}</p>
          {profile?.subscription?.expiresAt && (
            <p>
              <strong>Expiró:</strong> {' '}
              {new Date(profile.subscription.expiresAt).toLocaleDateString('es-AR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </p>
          )}
        </div>

        <div className="expired-actions">
          <a
            href="mailto:soporte@tuplay.top?subject=Renovación de suscripción - Buscador de Noticias"
            className="btn btn-primary"
          >
            <FiMail size={18} />
            <span>Contactar para Renovar</span>
          </a>

          <button onClick={logout} className="btn btn-secondary">
            <FiLogOut size={18} />
            <span>Cerrar Sesión</span>
          </button>
        </div>

        <p className="expired-footer">
          ¿Crees que es un error? Contacta a soporte.
        </p>
      </div>
    </div>
  )
}

export default Expired

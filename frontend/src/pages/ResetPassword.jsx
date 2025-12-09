import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FiMail, FiArrowLeft } from 'react-icons/fi'
import LoadingSpinner from '../components/LoadingSpinner'

const ResetPassword = () => {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email) {
      setError('Por favor ingresa tu email')
      return
    }

    try {
      setSubmitting(true)
      await resetPassword(email)
      setSent(true)
    } catch (err) {
      // El error ya se muestra via toast
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-header">
            <div className="success-icon">
              <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="30" cy="30" r="27" stroke="#48bb78" strokeWidth="2.5" fill="none"/>
                <path d="M20 30 L27 37 L42 22" stroke="#48bb78" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1>Email Enviado</h1>
            <p className="subtitle">
              Revisa tu bandeja de entrada en <strong>{email}</strong>
            </p>
          </div>

          <div className="auth-form">
            <p className="info-text">
              Te enviamos un enlace para restablecer tu contraseña.
              Si no lo encuentras, revisa la carpeta de spam.
            </p>

            <Link to="/login" className="btn btn-primary btn-full">
              Volver al Login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <div className="auth-logo">
            <FiMail size={48} />
          </div>
          <h1>Recuperar Contraseña</h1>
          <p className="subtitle">Te enviaremos un enlace para restablecerla</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="email">Email de tu cuenta</label>
            <div className="input-wrapper">
              <FiMail className="input-icon" />
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                disabled={submitting}
                autoComplete="email"
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={submitting}
          >
            {submitting ? <LoadingSpinner size="small" /> : 'Enviar Enlace'}
          </button>
        </form>

        <p className="auth-footer">
          <Link to="/login" className="back-link">
            <FiArrowLeft size={16} />
            Volver al Login
          </Link>
        </p>
      </div>
    </div>
  )
}

export default ResetPassword

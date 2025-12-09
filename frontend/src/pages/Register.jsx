import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FiMail, FiLock, FiEye, FiEyeOff, FiUser } from 'react-icons/fi'
import { FcGoogle } from 'react-icons/fc'
import LoadingSpinner from '../components/LoadingSpinner'

const Register = () => {
  const { register, loginGoogle, isAuthenticated, loading } = useAuth()
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Si ya está autenticado, redirigir
  if (isAuthenticated && !loading) {
    return <Navigate to="/dashboard" replace />
  }

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const { displayName, email, password, confirmPassword } = formData

    if (!email || !password) {
      setError('Por favor completa todos los campos obligatorios')
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    try {
      setSubmitting(true)
      await register(email, password, displayName)
    } catch (err) {
      // El error ya se muestra via toast
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      setSubmitting(true)
      await loginGoogle()
    } catch (err) {
      // El error ya se muestra via toast
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <div className="auth-logo">
            <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="30" cy="30" r="27" stroke="currentColor" strokeWidth="2.5" fill="none"/>
              <circle cx="38" cy="38" r="12" stroke="currentColor" strokeWidth="2.5" fill="none"/>
              <line x1="46" y1="46" x2="55" y2="55" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
              <circle cx="20" cy="20" r="5" fill="currentColor"/>
            </svg>
          </div>
          <h1>Crear Cuenta</h1>
          <p className="subtitle">30 días de prueba gratis</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="displayName">Nombre (opcional)</label>
            <div className="input-wrapper">
              <FiUser className="input-icon" />
              <input
                type="text"
                id="displayName"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                placeholder="Tu nombre"
                disabled={submitting}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email *</label>
            <div className="input-wrapper">
              <FiMail className="input-icon" />
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="tu@email.com"
                disabled={submitting}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña *</label>
            <div className="input-wrapper">
              <FiLock className="input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Mínimo 6 caracteres"
                disabled={submitting}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmar Contraseña *</label>
            <div className="input-wrapper">
              <FiLock className="input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Repetir contraseña"
                disabled={submitting}
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={submitting}
          >
            {submitting ? <LoadingSpinner size="small" /> : 'Crear Cuenta'}
          </button>

          <div className="auth-divider">
            <span>o regístrate con</span>
          </div>

          <button
            type="button"
            className="btn btn-google btn-full"
            onClick={handleGoogleLogin}
            disabled={submitting}
          >
            <FcGoogle size={20} />
            <span>Google</span>
          </button>
        </form>

        <p className="auth-footer">
          ¿Ya tienes cuenta? <Link to="/login">Iniciar Sesión</Link>
        </p>
      </div>
    </div>
  )
}

export default Register

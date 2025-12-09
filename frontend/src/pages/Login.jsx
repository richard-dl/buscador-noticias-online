import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi'
import { FcGoogle } from 'react-icons/fc'
import LoadingSpinner from '../components/LoadingSpinner'

const Login = () => {
  const { login, loginGoogle, isAuthenticated, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Si ya está autenticado, redirigir
  if (isAuthenticated && !loading) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Por favor completa todos los campos')
      return
    }

    try {
      setSubmitting(true)
      await login(email, password)
    } catch (err) {
      // El error ya se muestra via toast en AuthContext
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
          <h1>Buscador de Noticias</h1>
          <p className="subtitle">Busca, traduce, crea emojis y da formato listo para publicar</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="email">Email</label>
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

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <div className="input-wrapper">
              <FiLock className="input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={submitting}
                autoComplete="current-password"
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

          <div className="form-links">
            <Link to="/reset-password">¿Olvidaste tu contraseña?</Link>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={submitting}
          >
            {submitting ? <LoadingSpinner size="small" /> : 'Iniciar Sesión'}
          </button>

          <div className="auth-divider">
            <span>o continúa con</span>
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
          ¿No tienes cuenta? <Link to="/register">Regístrate gratis</Link>
        </p>
      </div>
    </div>
  )
}

export default Login

import { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import {
  registerWithEmail,
  loginWithEmail,
  loginWithGoogle,
  logout as firebaseLogout,
  resetPassword as firebaseResetPassword,
  onAuthChange,
  getIdToken
} from '../services/firebase'
import { authApi, userApi } from '../services/api'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // Escuchar cambios de autenticación
  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        // Cargar perfil desde el backend
        try {
          const response = await authApi.login()
          if (response.success) {
            setProfile(response.data)
            // Verificar si está expirado
            if (response.data.isExpired) {
              navigate('/expired')
            }
          }
        } catch (error) {
          console.error('Error cargando perfil:', error)
        }
      } else {
        setUser(null)
        setProfile(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [navigate])

  // Registro con email
  const register = async (email, password, displayName = '') => {
    try {
      setLoading(true)
      const firebaseUser = await registerWithEmail(email, password)

      // Registrar en backend
      await authApi.register({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName,
        authProvider: 'email'
      })

      toast.success('¡Registro exitoso! Tienes 30 días de prueba gratis.')
      navigate('/dashboard')
    } catch (error) {
      console.error('Error en registro:', error)
      let message = 'Error al registrar'
      if (error.code === 'auth/email-already-in-use') {
        message = 'Este email ya está registrado'
      } else if (error.code === 'auth/weak-password') {
        message = 'La contraseña debe tener al menos 6 caracteres'
      }
      toast.error(message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Login con email
  const login = async (email, password) => {
    try {
      setLoading(true)
      await loginWithEmail(email, password)
      toast.success('¡Bienvenido!')
      navigate('/dashboard')
    } catch (error) {
      console.error('Error en login:', error)
      let message = 'Error al iniciar sesión'
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        message = 'Email o contraseña incorrectos'
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Demasiados intentos. Intenta más tarde.'
      }
      toast.error(message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Login con Google
  const loginGoogle = async () => {
    try {
      setLoading(true)
      const firebaseUser = await loginWithGoogle()

      // Verificar/crear en backend
      await authApi.login()

      toast.success('¡Bienvenido!')
      navigate('/dashboard')
    } catch (error) {
      console.error('Error en login Google:', error)
      if (error.code !== 'auth/popup-closed-by-user') {
        toast.error('Error al iniciar sesión con Google')
      }
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Logout
  const logout = async () => {
    try {
      await firebaseLogout()
      setUser(null)
      setProfile(null)
      toast.info('Sesión cerrada')
      navigate('/login')
    } catch (error) {
      console.error('Error en logout:', error)
      toast.error('Error al cerrar sesión')
    }
  }

  // Reset password
  const resetPassword = async (email) => {
    try {
      await firebaseResetPassword(email)
      toast.success('Se envió un email para restablecer tu contraseña')
    } catch (error) {
      console.error('Error en reset:', error)
      let message = 'Error al enviar email'
      if (error.code === 'auth/user-not-found') {
        message = 'No existe una cuenta con este email'
      }
      toast.error(message)
      throw error
    }
  }

  // Refrescar perfil
  const refreshProfile = async () => {
    try {
      const response = await userApi.getProfile()
      if (response.success) {
        setProfile(response.data)
      }
    } catch (error) {
      console.error('Error refrescando perfil:', error)
    }
  }

  const value = {
    user,
    profile,
    loading,
    isAuthenticated: !!user,
    isExpired: profile?.subscription?.status === 'expired',
    daysRemaining: profile?.subscription?.daysRemaining || 0,
    register,
    login,
    loginGoogle,
    logout,
    resetPassword,
    refreshProfile,
    getIdToken
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

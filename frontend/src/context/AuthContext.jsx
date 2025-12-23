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

  // Mostrar alertas de suscripción según el estado
  const showSubscriptionAlerts = (data) => {
    const { role, subscriptionType, daysRemaining, isExpired, isNewUser } = data

    // No mostrar alertas para admin
    if (role === 'admin') return

    // Usuario nuevo - solo bienvenida (ya se muestra en login/register)
    if (isNewUser) return

    // Suscripción expirada
    if (isExpired) {
      if (subscriptionType === 'trial') {
        toast.error('Tu período de prueba ha terminado. Activa tu suscripción para continuar.', {
          autoClose: 8000
        })
      } else if (subscriptionType === 'vip_trial') {
        toast.warning('Tu prueba VIP ha terminado. Activa VIP anual para mantener acceso a IA.', {
          autoClose: 8000
        })
      } else if (subscriptionType === 'vip') {
        toast.warning('Tu suscripción VIP ha vencido. Renueva para mantener acceso a IA.', {
          autoClose: 8000
        })
      }
      return
    }

    // Alertas por días restantes (solo para roles con expiración)
    if (daysRemaining !== null && daysRemaining !== undefined) {
      if (daysRemaining === 0) {
        // Último día
        if (subscriptionType === 'trial') {
          toast.error('Hoy es tu último día de prueba. Activa tu suscripción ahora.', {
            autoClose: 10000
          })
        } else if (subscriptionType === 'vip_trial') {
          toast.error('Hoy termina tu prueba VIP. Activa VIP anual para no perder acceso.', {
            autoClose: 10000
          })
        } else if (subscriptionType === 'vip') {
          toast.error('Tu VIP vence hoy. Renueva ahora para mantener el acceso.', {
            autoClose: 10000
          })
        }
      } else if (daysRemaining <= 3) {
        // 1-3 días restantes
        if (subscriptionType === 'trial') {
          toast.warning(`Tu prueba vence en ${daysRemaining} día${daysRemaining > 1 ? 's' : ''}. Activa tu suscripción.`, {
            autoClose: 7000
          })
        } else if (subscriptionType === 'vip_trial') {
          toast.warning(`Tu prueba VIP vence en ${daysRemaining} día${daysRemaining > 1 ? 's' : ''}. Considera activar VIP.`, {
            autoClose: 7000
          })
        } else if (subscriptionType === 'vip') {
          toast.warning(`Tu VIP vence en ${daysRemaining} día${daysRemaining > 1 ? 's' : ''}. Renueva pronto.`, {
            autoClose: 7000
          })
        }
      } else if (daysRemaining <= 7) {
        // 4-7 días restantes
        if (subscriptionType === 'trial') {
          toast.info(`Te quedan ${daysRemaining} días de prueba.`, { autoClose: 5000 })
        } else if (subscriptionType === 'vip_trial') {
          toast.info(`Te quedan ${daysRemaining} días de prueba VIP.`, { autoClose: 5000 })
        } else if (subscriptionType === 'vip') {
          toast.info(`Tu VIP vence en ${daysRemaining} días.`, { autoClose: 5000 })
        }
      }
    }
  }

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

            // Mostrar alertas de suscripción
            showSubscriptionAlerts(response.data)

            // Verificar si está expirado (solo trial expirado bloquea acceso)
            if (response.data.isExpired && response.data.subscriptionType === 'trial') {
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
      const firebaseUser = await loginWithEmail(email, password)
      const name = firebaseUser?.displayName || email.split('@')[0]
      toast.success(`¡Bienvenido, ${name}!`)
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

      const name = firebaseUser?.displayName || firebaseUser?.email?.split('@')[0] || 'Usuario'
      toast.success(`¡Bienvenido, ${name}!`)
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

  // Verificar si el usuario tiene acceso VIP (vip_trial, vip, admin)
  const hasVipAccess = ['vip_trial', 'vip', 'admin'].includes(profile?.role)

  // daysRemaining: null para admin/suscriptor (sin expiración), número para trial/vip_trial/vip
  const daysRemaining = profile?.daysRemaining

  // Función para verificar autenticación antes de una acción
  // Redirige a login si no está autenticado
  const requireAuth = (actionName = 'realizar esta acción') => {
    if (!user) {
      toast.info(`Debes iniciar sesión para ${actionName}`, { autoClose: 4000 })
      navigate('/login')
      return false
    }
    // Verificar si trial expirado
    if (profile?.isExpired && profile?.subscriptionType === 'trial') {
      navigate('/expired')
      return false
    }
    return true
  }

  const value = {
    user,
    profile,
    loading,
    isAuthenticated: !!user,
    isExpired: profile?.isExpired || false,
    daysRemaining,
    hasVipAccess,
    register,
    login,
    loginGoogle,
    logout,
    resetPassword,
    refreshProfile,
    requireAuth,
    getIdToken
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

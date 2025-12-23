import { initializeApp } from 'firebase/app'
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged
} from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const googleProvider = new GoogleAuthProvider()

// Configurar proveedor de Google
googleProvider.setCustomParameters({
  prompt: 'select_account'
})

/**
 * Registrar usuario con email y contraseña
 */
export const registerWithEmail = async (email, password) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password)
  return userCredential.user
}

/**
 * Iniciar sesión con email y contraseña
 */
export const loginWithEmail = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password)
  return userCredential.user
}

/**
 * Detectar si es dispositivo móvil
 */
const isMobile = () => {
  return /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

/**
 * Iniciar sesión con Google
 * Usa redirect en móviles (más confiable) y popup en desktop
 */
export const loginWithGoogle = async () => {
  if (isMobile()) {
    // En móviles usar redirect (el resultado se maneja en checkRedirectResult)
    await signInWithRedirect(auth, googleProvider)
    return null // El usuario será retornado después del redirect
  } else {
    // En desktop usar popup
    const result = await signInWithPopup(auth, googleProvider)
    return result.user
  }
}

/**
 * Verificar resultado de redirect (para móviles)
 * Llamar esto al iniciar la app
 */
export const checkRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth)
    if (result) {
      return result.user
    }
    return null
  } catch (error) {
    console.error('Error en redirect result:', error)
    throw error
  }
}

/**
 * Cerrar sesión
 */
export const logout = async () => {
  await signOut(auth)
}

/**
 * Enviar email para restablecer contraseña
 */
export const resetPassword = async (email) => {
  await sendPasswordResetEmail(auth, email)
}

/**
 * Obtener token del usuario actual
 */
export const getIdToken = async () => {
  const user = auth.currentUser
  if (!user) return null
  return user.getIdToken()
}

/**
 * Suscribirse a cambios de autenticación
 */
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback)
}

export { auth, app }

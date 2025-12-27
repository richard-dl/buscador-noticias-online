import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

// Pages
import Login from './pages/Login'
import Register from './pages/Register'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Generator from './pages/Generator'
import Profile from './pages/Profile'
import Expired from './pages/Expired'
import ZonaVip from './pages/ZonaVip'
import Subscription from './pages/Subscription'
import Sessions from './pages/Sessions'
import TVStreaming from './pages/TVStreaming'

// Components
import ProtectedRoute from './components/ProtectedRoute'
import LoadingSpinner from './components/LoadingSpinner'
import ScrollToTop from './components/ScrollToTop'

function App() {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-container">
        <LoadingSpinner size="large" />
        <p>Cargando...</p>
      </div>
    )
  }

  return (
    <>
    <Routes>
      {/* Rutas públicas */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/expired" element={<Expired />} />

      {/* Rutas semi-públicas (ver sin login, acciones requieren login) */}
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/generator" element={<Generator />} />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/zona-vip"
        element={
          <ProtectedRoute>
            <ZonaVip />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sessions"
        element={
          <ProtectedRoute>
            <Sessions />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tv"
        element={
          <ProtectedRoute>
            <TVStreaming />
          </ProtectedRoute>
        }
      />
      {/* Subscription es público para ver planes, acciones requieren login */}
      <Route path="/subscription" element={<Subscription />} />

      {/* Redirección por defecto */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
    <ScrollToTop />
    </>
  )
}

export default App

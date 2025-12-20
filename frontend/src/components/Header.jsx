import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FiHome, FiFileText, FiUser, FiLogOut, FiMenu, FiX, FiStar, FiCreditCard } from 'react-icons/fi'
import { useState } from 'react'

const Header = () => {
  const { user, profile, logout, daysRemaining } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const navItems = [
    { path: '/dashboard', label: 'Inicio', icon: FiHome },
    { path: '/generator', label: 'Generador', icon: FiFileText },
    { path: '/zona-vip', label: 'Zona VIP', icon: FiStar, isVip: true },
    { path: '/subscription', label: 'Planes', icon: FiCreditCard },
    { path: '/profile', label: 'Perfil', icon: FiUser }
  ]

  const isActive = (path) => location.pathname === path

  // Manejar clic en navegación - forzar recarga si ya estamos en la misma ruta
  const handleNavClick = (e, path) => {
    setMenuOpen(false)
    if (location.pathname === path) {
      e.preventDefault()
      // Forzar recarga de la página para resetear el estado (tabs, etc.)
      window.location.href = path
    }
  }

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/dashboard" className="header-logo">
          <div className="logo-icon">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="2" fill="none"/>
              <circle cx="25" cy="25" r="8" stroke="currentColor" strokeWidth="2" fill="none"/>
              <line x1="30" y1="30" x2="36" y2="36" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="14" cy="14" r="3" fill="currentColor"/>
            </svg>
          </div>
          <div className="logo-text">
            <span className="logo-title">Buscador de Noticias</span>
            <span className="logo-subtitle">Online</span>
          </div>
        </Link>

        <button
          className="menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menú"
        >
          {menuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
        </button>

        <nav className={`header-nav ${menuOpen ? 'open' : ''}`}>
          {navItems.map(({ path, label, icon: Icon, isVip }) => (
            <Link
              key={path}
              to={path}
              className={`nav-link ${isActive(path) ? 'active' : ''} ${isVip ? 'nav-link-vip' : ''}`}
              onClick={(e) => handleNavClick(e, path)}
              title={label}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className={`header-user ${menuOpen ? 'open' : ''}`}>
          {profile?.role === 'admin' ? (
            <span className="admin-badge">
              👑 Administrador
            </span>
          ) : daysRemaining !== null && daysRemaining !== undefined && daysRemaining <= 7 && (
            <span className="days-warning">
              {daysRemaining} días restantes
            </span>
          )}
          <button className="btn-logout" onClick={logout} title="Cerrar sesión">
            <FiLogOut size={18} />
            <span>Salir</span>
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header

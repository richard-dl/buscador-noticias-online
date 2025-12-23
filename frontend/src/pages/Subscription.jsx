import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { subscriptionApi } from '../services/api'
import Header from '../components/Header'
import LoadingSpinner from '../components/LoadingSpinner'
import { toast } from 'react-toastify'
import {
  FiCheck, FiX, FiClock, FiStar, FiZap, FiShield, FiAward, FiGift, FiCreditCard, FiTrendingUp
} from 'react-icons/fi'

const Subscription = () => {
  const { profile, refreshProfile, isAuthenticated, requireAuth } = useAuth()
  const [plans, setPlans] = useState(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activating, setActivating] = useState(null)

  useEffect(() => {
    loadData()
  }, [isAuthenticated])

  const loadData = async () => {
    try {
      // Planes siempre se cargan (públicos)
      const plansRes = await subscriptionApi.getPlans()
      if (plansRes.success) {
        setPlans(plansRes.data)
      }

      // Status solo si está autenticado
      if (isAuthenticated) {
        const statusRes = await subscriptionApi.getStatus()
        if (statusRes.success) {
          setSubscriptionStatus(statusRes.data)
        }
      }
    } catch (error) {
      console.error('Error cargando datos:', error)
      // Solo mostrar error si está autenticado (los planes públicos no deberían fallar)
      if (isAuthenticated) {
        toast.error('Error al cargar información de suscripción')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleActivateVipTrial = async () => {
    if (!requireAuth('activar la prueba VIP')) return
    try {
      setActivating('vip_trial')
      const response = await subscriptionApi.activateVipTrial()

      if (response.success) {
        toast.success('Período de prueba VIP activado')
        await refreshProfile()
        await loadData()
      }
    } catch (error) {
      toast.error(error.message || 'Error al activar prueba VIP')
    } finally {
      setActivating(null)
    }
  }

  const handlePayment = (planType) => {
    if (!requireAuth('suscribirte')) return
    toast.info('Próximamente: Integración con pasarela de pagos')
    console.log('Iniciar pago para:', planType)
  }

  const getRoleName = (role) => {
    const names = {
      trial: 'Trial',
      suscriptor: 'Suscriptor',
      vip_trial: 'VIP Trial',
      vip: 'VIP',
      admin: 'Administrador'
    }
    return names[role] || role
  }

  const getRoleBadgeClass = (role) => {
    const classes = {
      trial: 'badge-trial',
      suscriptor: 'badge-suscriptor',
      vip_trial: 'badge-vip-trial',
      vip: 'badge-vip',
      admin: 'badge-admin'
    }
    return classes[role] || 'badge-default'
  }

  if (loading) {
    return (
      <div className="subscription-page">
        <Header />
        <main className="subscription-main">
          <div className="subscription-loading">
            <LoadingSpinner size="large" />
            <p>Cargando planes...</p>
          </div>
        </main>
      </div>
    )
  }

  const currentRole = isAuthenticated ? (subscriptionStatus?.role || profile?.role || 'trial') : null
  const isAdmin = currentRole === 'admin'
  const isGuest = !isAuthenticated

  // Características de Zona VIP
  const zonaVipFeature = 'Zona VIP: informes en tiempo real de PFA, PSA, GNA, policías provinciales, Ministerio de Seguridad y más'

  return (
    <div className="subscription-page">
      <Header />

      <main className="subscription-main">
        <div className="subscription-header">
          <h1>Planes de Suscripción</h1>
          <p className="subscription-subtitle">
            Elige el plan que mejor se adapte a tus necesidades
          </p>
        </div>

        {/* Estado actual */}
        <section className="current-status-card">
          <div className="status-info">
            <h3>{isGuest ? 'Bienvenido' : 'Tu plan actual'}</h3>
            {isGuest ? (
              <div className="status-details">
                <p className="guest-message">
                  <a href="/register" className="guest-link">Regístrate</a> o <a href="/login" className="guest-link">inicia sesión</a> para acceder a todas las funciones
                </p>
              </div>
            ) : (
              <>
                <div className="status-details">
                  <span className={`badge badge-lg ${getRoleBadgeClass(currentRole)}`}>
                    {getRoleName(currentRole)}
                  </span>

                  {subscriptionStatus?.daysRemaining !== undefined && !isAdmin && !subscriptionStatus?.isLifetime && (
                    <span className="days-remaining">
                      <FiClock size={16} />
                      {subscriptionStatus.daysRemaining} días restantes
                    </span>
                  )}

                  {subscriptionStatus?.isLifetime && (
                    <span className="lifetime-badge">
                      <FiShield size={16} />
                      Acceso vitalicio
                    </span>
                  )}

                  {isAdmin && (
                    <span className="admin-badge-status">
                      <FiAward size={16} />
                      Acceso ilimitado
                    </span>
                  )}
                </div>

                {subscriptionStatus?.hasVipAccess && (
                  <p className="vip-access-note">
                    <FiZap size={16} />
                    Tienes acceso a herramientas de IA
                  </p>
                )}
              </>
            )}
          </div>
        </section>

        {/* Planes - Grid de 4 columnas */}
        <div className="plans-grid">
          {/* Plan Trial */}
          <div className={`plan-card ${currentRole === 'trial' ? 'current-plan' : ''}`}>
            <div className="plan-header">
              <span className="plan-icon"><FiGift /></span>
              <h2>Trial</h2>
              <div className="plan-price">
                <span className="price">Gratis</span>
                <span className="period">30 días</span>
              </div>
            </div>

            <ul className="plan-features">
              <li><FiCheck className="check" /> Búsqueda de noticias</li>
              <li><FiCheck className="check" /> Guardar noticias favoritas</li>
              <li><FiCheck className="check" /> Perfiles de búsqueda</li>
              <li className="limitation"><FiX className="x" /> Sin acceso a herramientas de IA</li>
              <li className="limitation"><FiX className="x" /> Sin acceso a Zona VIP</li>
              <li className="limitation"><FiX className="x" /> Período limitado a 30 días</li>
            </ul>

            <div className="plan-action">
              {isGuest ? (
                <a href="/register" className="btn btn-secondary btn-block">
                  <FiGift size={18} />
                  Registrarme gratis
                </a>
              ) : currentRole === 'trial' ? (
                <span className="current-label">Plan actual</span>
              ) : (
                <span className="not-available">Solo para nuevos usuarios</span>
              )}
            </div>
          </div>

          {/* Plan Suscriptor */}
          <div className={`plan-card plan-featured ${currentRole === 'suscriptor' ? 'current-plan' : ''}`}>
            <div className="plan-badge">Recomendado</div>
            <div className="plan-header">
              <span className="plan-icon"><FiCreditCard /></span>
              <h2>Suscriptor</h2>
              <div className="plan-price">
                <span className="price">$39</span>
                <span className="period">Pago único / Vitalicio</span>
              </div>
            </div>

            <ul className="plan-features">
              <li><FiCheck className="check" /> Todo lo incluido en Trial</li>
              <li><FiCheck className="check" /> Acceso permanente sin vencimiento</li>
              <li><FiCheck className="check" /> Soporte prioritario</li>
              <li className="limitation"><FiX className="x" /> Sin acceso a herramientas de IA</li>
              <li className="limitation"><FiX className="x" /> Sin acceso a Zona VIP</li>
            </ul>

            <div className="plan-action">
              {isGuest ? (
                <button
                  className="btn btn-primary btn-block"
                  onClick={() => handlePayment('suscriptor')}
                >
                  <FiStar size={18} />
                  Suscribirme por $39
                </button>
              ) : currentRole === 'trial' ? (
                <button
                  className="btn btn-primary btn-block"
                  onClick={() => handlePayment('suscriptor')}
                >
                  <FiStar size={18} />
                  Suscribirme por $39
                </button>
              ) : currentRole === 'suscriptor' || currentRole === 'vip_trial' || currentRole === 'vip' ? (
                <span className="current-label">
                  {currentRole === 'suscriptor' ? 'Plan actual' : 'Incluido en tu plan'}
                </span>
              ) : isAdmin ? (
                <span className="admin-note">Acceso de administrador</span>
              ) : (
                <span className="not-available">No disponible</span>
              )}
            </div>
          </div>

          {/* Plan VIP Trial */}
          <div className={`plan-card ${currentRole === 'vip_trial' ? 'current-plan' : ''}`}>
            <div className="plan-header">
              <span className="plan-icon"><FiZap /></span>
              <h2>VIP Trial</h2>
              <div className="plan-price">
                <span className="price">Gratis</span>
                <span className="period">30 días</span>
              </div>
            </div>

            <ul className="plan-features">
              <li><FiCheck className="check" /> Todo lo incluido en Suscriptor</li>
              <li><FiCheck className="check" /> Acceso completo a herramientas de IA</li>
              <li><FiCheck className="check" /> Resúmenes automáticos de noticias</li>
              <li><FiCheck className="check" /> Análisis de contenido con IA</li>
              <li><FiCheck className="check" /> {zonaVipFeature}</li>
              <li className="limitation"><FiX className="x" /> Período limitado a 30 días</li>
              <li className="limitation"><FiX className="x" /> Solo disponible una vez</li>
            </ul>

            <div className="plan-action">
              {isGuest ? (
                <span className="not-available">Requiere ser Suscriptor</span>
              ) : currentRole === 'suscriptor' && subscriptionStatus?.canActivateVipTrial ? (
                <button
                  className="btn btn-secondary btn-block"
                  onClick={handleActivateVipTrial}
                  disabled={activating === 'vip_trial'}
                >
                  {activating === 'vip_trial' ? (
                    <LoadingSpinner size="small" />
                  ) : (
                    <>
                      <FiZap size={18} />
                      Probar VIP gratis
                    </>
                  )}
                </button>
              ) : currentRole === 'vip_trial' ? (
                <span className="current-label">Plan actual</span>
              ) : currentRole === 'vip' ? (
                <span className="current-label">Ya eres VIP</span>
              ) : currentRole === 'suscriptor' && !subscriptionStatus?.canActivateVipTrial ? (
                <span className="not-available">Ya usaste tu prueba</span>
              ) : isAdmin ? (
                <span className="admin-note">Acceso de administrador</span>
              ) : (
                <span className="not-available">Requiere ser Suscriptor</span>
              )}
            </div>
          </div>

          {/* Plan VIP Anual */}
          <div className={`plan-card plan-premium ${currentRole === 'vip' ? 'current-plan' : ''}`}>
            <div className="plan-badge premium">Premium</div>
            <div className="plan-header">
              <span className="plan-icon"><FiTrendingUp /></span>
              <h2>VIP Anual</h2>
              <div className="plan-price">
                <span className="price">$90</span>
                <span className="period">por año</span>
              </div>
            </div>

            <ul className="plan-features">
              <li><FiCheck className="check" /> Todo lo incluido en Suscriptor</li>
              <li><FiCheck className="check" /> Acceso completo a herramientas de IA</li>
              <li><FiCheck className="check" /> Resúmenes automáticos de noticias</li>
              <li><FiCheck className="check" /> Análisis de contenido con IA</li>
              <li><FiCheck className="check" /> {zonaVipFeature}</li>
              <li><FiCheck className="check" /> Soporte premium 24/7</li>
            </ul>

            <div className="plan-action">
              {isGuest ? (
                <button
                  className="btn btn-vip btn-block"
                  onClick={() => handlePayment('vip')}
                >
                  <FiAward size={18} />
                  Activar VIP $90/año
                </button>
              ) : (currentRole === 'suscriptor' || currentRole === 'vip_trial') ? (
                <button
                  className="btn btn-vip btn-block"
                  onClick={() => handlePayment('vip')}
                >
                  <FiAward size={18} />
                  Activar VIP $90/año
                </button>
              ) : currentRole === 'vip' ? (
                <>
                  <span className="current-label">Plan actual</span>
                  <button
                    className="btn btn-outline btn-block mt-2"
                    onClick={() => handlePayment('vip_renew')}
                  >
                    Renovar suscripción
                  </button>
                </>
              ) : isAdmin ? (
                <span className="admin-note">Acceso de administrador</span>
              ) : (
                <span className="not-available">Requiere ser Suscriptor</span>
              )}
            </div>
          </div>
        </div>

        {/* Información adicional */}
        <section className="subscription-info">
          <h3>Preguntas Frecuentes</h3>

          <div className="faq-grid">
            <div className="faq-item">
              <h4>¿Qué incluye la suscripción vitalicia?</h4>
              <p>
                Por un único pago de $39 USD, obtienes acceso permanente a la plataforma
                de búsqueda de noticias, sin límite de tiempo.
              </p>
            </div>

            <div className="faq-item">
              <h4>¿Qué son las herramientas de IA?</h4>
              <p>
                Los usuarios VIP tienen acceso a resúmenes automáticos de noticias,
                análisis de contenido y contenido exclusivo generado con inteligencia artificial.
              </p>
            </div>

            <div className="faq-item">
              <h4>¿Puedo probar el plan VIP antes de pagar?</h4>
              <p>
                Sí. Los suscriptores pueden activar una prueba gratuita de 30 días
                del plan VIP para probar todas las funciones de IA.
              </p>
            </div>

            <div className="faq-item">
              <h4>¿Qué pasa si no renuevo el VIP anual?</h4>
              <p>
                Si no renuevas, mantienes tu acceso como Suscriptor vitalicio,
                pero pierdes las herramientas de IA hasta que renueves.
              </p>
            </div>

            <div className="faq-item">
              <h4>¿Qué es la Zona VIP?</h4>
              <p>
                En la Zona VIP se publican en tiempo real informes directos de instituciones
                como Policía Federal (PFA), Policía de Seguridad Aeroportuaria (PSA),
                Gendarmería Nacional (GNA), policías provinciales, Ministerio de Seguridad,
                Policía de la Ciudad de Buenos Aires, municipios y otras fuentes oficiales.
              </p>
            </div>

            <div className="faq-item">
              <h4>¿Cómo puedo pagar?</h4>
              <p>
                Aceptamos pagos con tarjeta de crédito, débito y transferencia bancaria.
                Próximamente habilitaremos más métodos de pago.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default Subscription

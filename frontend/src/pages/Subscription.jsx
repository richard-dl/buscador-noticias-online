import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { subscriptionApi } from '../services/api'
import Header from '../components/Header'
import LoadingSpinner from '../components/LoadingSpinner'
import { toast } from 'react-toastify'
import {
  FiCheck, FiX, FiClock, FiStar, FiZap, FiShield, FiAward
} from 'react-icons/fi'

const Subscription = () => {
  const { profile, refreshProfile } = useAuth()
  const [plans, setPlans] = useState(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activating, setActivating] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [plansRes, statusRes] = await Promise.all([
        subscriptionApi.getPlans(),
        subscriptionApi.getStatus()
      ])

      if (plansRes.success) {
        setPlans(plansRes.data)
      }

      if (statusRes.success) {
        setSubscriptionStatus(statusRes.data)
      }
    } catch (error) {
      console.error('Error cargando datos:', error)
      toast.error('Error al cargar información de suscripción')
    } finally {
      setLoading(false)
    }
  }

  const handleActivateVipTrial = async () => {
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
    // Aquí se integrará la pasarela de pagos
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
        <main className="subscription-main container">
          <LoadingSpinner size="large" text="Cargando planes..." />
        </main>
      </div>
    )
  }

  const currentRole = subscriptionStatus?.role || profile?.role || 'trial'
  const isAdmin = currentRole === 'admin'

  return (
    <div className="subscription-page">
      <Header />

      <main className="subscription-main container">
        <div className="subscription-header">
          <h1>Planes de Suscripción</h1>
          <p className="subscription-subtitle">
            Elige el plan que mejor se adapte a tus necesidades
          </p>
        </div>

        {/* Estado actual */}
        <section className="current-status-card">
          <div className="status-info">
            <h3>Tu plan actual</h3>
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
                <span className="admin-badge">
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
          </div>
        </section>

        {/* Planes */}
        <div className="plans-grid">
          {/* Plan Trial */}
          <div className={`plan-card ${currentRole === 'trial' ? 'current-plan' : ''}`}>
            <div className="plan-header">
              <h2>Trial</h2>
              <div className="plan-price">
                <span className="price">Gratis</span>
                <span className="period">30 días</span>
              </div>
            </div>

            <ul className="plan-features">
              {plans?.trial?.features?.map((feature, i) => (
                <li key={i}><FiCheck className="check" /> {feature}</li>
              ))}
              {plans?.trial?.limitations?.map((limit, i) => (
                <li key={`limit-${i}`} className="limitation">
                  <FiX className="x" /> {limit}
                </li>
              ))}
            </ul>

            <div className="plan-action">
              {currentRole === 'trial' ? (
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
              <h2>Suscriptor</h2>
              <div className="plan-price">
                <span className="price">$39</span>
                <span className="period">Pago único / Vitalicio</span>
              </div>
            </div>

            <ul className="plan-features">
              {plans?.suscriptor?.features?.map((feature, i) => (
                <li key={i}><FiCheck className="check" /> {feature}</li>
              ))}
              {plans?.suscriptor?.limitations?.map((limit, i) => (
                <li key={`limit-${i}`} className="limitation">
                  <FiX className="x" /> {limit}
                </li>
              ))}
            </ul>

            <div className="plan-action">
              {currentRole === 'trial' ? (
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
              <h2>VIP Trial</h2>
              <div className="plan-price">
                <span className="price">Gratis</span>
                <span className="period">30 días</span>
              </div>
            </div>

            <ul className="plan-features">
              {plans?.vip_trial?.features?.map((feature, i) => (
                <li key={i}><FiCheck className="check" /> {feature}</li>
              ))}
              {plans?.vip_trial?.limitations?.map((limit, i) => (
                <li key={`limit-${i}`} className="limitation">
                  <FiX className="x" /> {limit}
                </li>
              ))}
            </ul>

            <div className="plan-action">
              {currentRole === 'suscriptor' && subscriptionStatus?.canActivateVipTrial ? (
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
              <h2>VIP Anual</h2>
              <div className="plan-price">
                <span className="price">$90</span>
                <span className="period">por año</span>
              </div>
            </div>

            <ul className="plan-features">
              {plans?.vip?.features?.map((feature, i) => (
                <li key={i}><FiCheck className="check" /> {feature}</li>
              ))}
            </ul>

            <div className="plan-action">
              {(currentRole === 'suscriptor' || currentRole === 'vip_trial') ? (
                <button
                  className="btn btn-vip btn-block"
                  onClick={() => handlePayment('vip')}
                >
                  <FiAward size={18} />
                  Activar VIP por $90/año
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
          </div>
        </section>
      </main>
    </div>
  )
}

export default Subscription

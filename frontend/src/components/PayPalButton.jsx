import { useState, useEffect } from 'react'
import { PayPalScriptProvider, PayPalButtons, PayPalCardFieldsProvider, PayPalNumberField, PayPalExpiryField, PayPalCVVField, usePayPalCardFields } from '@paypal/react-paypal-js'
import { paypalApi } from '../services/api'
import { toast } from 'react-toastify'
import LoadingSpinner from './LoadingSpinner'
import { FiCreditCard, FiLock } from 'react-icons/fi'

/**
 * Componente de botón de pago con PayPal
 * Soporta: PayPal Wallet + Tarjeta de crédito/débito
 */
const PayPalButton = ({ planType, onSuccess, onError, onCancel, disabled }) => {
  const [clientId, setClientId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('paypal') // 'paypal' o 'card'

  // Cargar configuración de PayPal
  useEffect(() => {
    loadPayPalConfig()
  }, [])

  const loadPayPalConfig = async () => {
    try {
      const response = await paypalApi.getConfig()
      if (response.success) {
        setClientId(response.data.clientId)
      } else {
        throw new Error('No se pudo obtener la configuración de PayPal')
      }
    } catch (err) {
      console.error('Error cargando configuración de PayPal:', err)
      setError('Error al cargar el sistema de pagos')
    } finally {
      setLoading(false)
    }
  }

  // Crear orden en el backend
  const createOrder = async () => {
    try {
      const response = await paypalApi.createOrder(planType)
      if (response.success) {
        return response.data.orderId
      } else {
        throw new Error(response.error || 'Error al crear la orden')
      }
    } catch (err) {
      console.error('Error creando orden:', err)
      toast.error(err.message || 'Error al iniciar el pago')
      throw err
    }
  }

  // Capturar pago en el backend
  const onApprove = async (data) => {
    try {
      const response = await paypalApi.captureOrder(data.orderID, planType)
      if (response.success) {
        toast.success(response.message || 'Pago procesado correctamente')
        if (onSuccess) {
          onSuccess(response.data)
        }
      } else {
        throw new Error(response.error || 'Error al procesar el pago')
      }
    } catch (err) {
      console.error('Error capturando pago:', err)
      toast.error(err.message || 'Error al procesar el pago')
      if (onError) {
        onError(err)
      }
    }
  }

  // Manejar errores de PayPal
  const handleError = (err) => {
    console.error('Error de PayPal:', err)
    toast.error('Error en el proceso de pago')
    if (onError) {
      onError(err)
    }
  }

  // Manejar cancelación
  const handleCancel = () => {
    toast.info('Pago cancelado')
    if (onCancel) {
      onCancel()
    }
  }

  if (loading) {
    return (
      <div className="paypal-loading">
        <LoadingSpinner size="small" />
        <span>Cargando opciones de pago...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="paypal-error">
        <p>{error}</p>
        <button onClick={loadPayPalConfig} className="btn btn-secondary btn-sm">
          Reintentar
        </button>
      </div>
    )
  }

  if (!clientId) {
    return (
      <div className="paypal-error">
        <p>Sistema de pagos no disponible</p>
      </div>
    )
  }

  const planPrices = {
    suscriptor: '$39 USD',
    vip: '$90 USD'
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId: clientId,
        currency: 'USD',
        intent: 'capture',
        components: 'buttons,card-fields',
        locale: 'es_AR'
      }}
    >
      <div className="paypal-container">
        {/* Selector de método de pago */}
        <div className="payment-method-selector">
          <button
            type="button"
            className={`method-btn ${paymentMethod === 'paypal' ? 'active' : ''}`}
            onClick={() => setPaymentMethod('paypal')}
            disabled={disabled}
          >
            <img
              src="https://www.paypalobjects.com/webstatic/mktg/Logo/pp-logo-100px.png"
              alt="PayPal"
              className="paypal-logo"
            />
            PayPal
          </button>
          <button
            type="button"
            className={`method-btn ${paymentMethod === 'card' ? 'active' : ''}`}
            onClick={() => setPaymentMethod('card')}
            disabled={disabled}
          >
            <FiCreditCard size={20} />
            Tarjeta
          </button>
        </div>

        {/* Botón de PayPal */}
        {paymentMethod === 'paypal' && (
          <div className="paypal-buttons-wrapper">
            <PayPalButtons
              style={{
                layout: 'vertical',
                color: 'blue',
                shape: 'rect',
                label: 'pay',
                height: 45
              }}
              disabled={disabled}
              createOrder={createOrder}
              onApprove={onApprove}
              onError={handleError}
              onCancel={handleCancel}
            />
          </div>
        )}

        {/* Campos de tarjeta */}
        {paymentMethod === 'card' && (
          <CardFieldsForm
            planType={planType}
            planPrice={planPrices[planType]}
            createOrder={createOrder}
            onApprove={onApprove}
            onError={handleError}
            disabled={disabled}
          />
        )}

        <div className="paypal-secure-badge">
          <FiLock size={14} />
          <span>Pago seguro procesado por PayPal</span>
        </div>
      </div>
    </PayPalScriptProvider>
  )
}

/**
 * Formulario de campos de tarjeta
 */
const CardFieldsForm = ({ planType, planPrice, createOrder, onApprove, onError, disabled }) => {
  const [paying, setPaying] = useState(false)

  return (
    <PayPalCardFieldsProvider
      createOrder={createOrder}
      onApprove={onApprove}
      onError={onError}
      style={{
        input: {
          'font-size': '16px',
          'font-family': 'inherit',
          'font-weight': '400',
          'color': '#333',
          'padding': '12px'
        },
        '.invalid': {
          'color': '#dc3545'
        }
      }}
    >
      <CardFields
        planPrice={planPrice}
        paying={paying}
        setPaying={setPaying}
        disabled={disabled}
      />
    </PayPalCardFieldsProvider>
  )
}

/**
 * Componente interno para los campos de tarjeta
 */
const CardFields = ({ planPrice, paying, setPaying, disabled }) => {
  const { cardFieldsForm } = usePayPalCardFields()

  const handleSubmit = async () => {
    if (!cardFieldsForm) {
      toast.error('Error: formulario no disponible')
      return
    }

    const formState = await cardFieldsForm.getState()

    if (!formState.isFormValid) {
      toast.warning('Por favor, completa todos los campos de la tarjeta')
      return
    }

    setPaying(true)
    try {
      await cardFieldsForm.submit()
    } catch (err) {
      console.error('Error enviando formulario:', err)
    } finally {
      setPaying(false)
    }
  }

  return (
    <div className="card-fields-container">
      <div className="card-field">
        <label>Número de tarjeta</label>
        <PayPalNumberField className="card-input" />
      </div>

      <div className="card-field-row">
        <div className="card-field">
          <label>Vencimiento</label>
          <PayPalExpiryField className="card-input" />
        </div>
        <div className="card-field">
          <label>CVV</label>
          <PayPalCVVField className="card-input" />
        </div>
      </div>

      <button
        type="button"
        className="btn btn-primary btn-block card-submit-btn"
        onClick={handleSubmit}
        disabled={disabled || paying}
      >
        {paying ? (
          <>
            <LoadingSpinner size="small" />
            Procesando...
          </>
        ) : (
          <>
            <FiLock size={18} />
            Pagar {planPrice}
          </>
        )}
      </button>
    </div>
  )
}

export default PayPalButton

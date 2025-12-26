import { useState, useEffect } from 'react'
import {
  PayPalScriptProvider,
  PayPalButtons,
  PayPalCardFieldsProvider,
  PayPalCardFieldsForm,
  usePayPalCardFields
} from '@paypal/react-paypal-js'
import { paypalApi } from '../services/api'
import { toast } from 'react-toastify'
import LoadingSpinner from './LoadingSpinner'
import { FiLock, FiCreditCard } from 'react-icons/fi'

/**
 * Botón de submit para Card Fields
 */
const CardFieldsSubmitButton = ({ disabled, processing }) => {
  const { cardFields } = usePayPalCardFields()

  const handleClick = async () => {
    if (!cardFields) {
      toast.error('Error: Campos de tarjeta no disponibles')
      return
    }

    try {
      await cardFields.submit()
    } catch (err) {
      console.error('Error al enviar pago con tarjeta:', err)
    }
  }

  return (
    <button
      type="button"
      className="btn btn-primary btn-block card-submit-btn"
      onClick={handleClick}
      disabled={disabled || processing}
    >
      {processing ? (
        <>
          <LoadingSpinner size="small" />
          <span>Procesando...</span>
        </>
      ) : (
        <>
          <FiCreditCard size={18} />
          <span>Pagar con Tarjeta</span>
        </>
      )}
    </button>
  )
}

/**
 * Componente de botón de pago con PayPal
 * Incluye botones de PayPal + Card Fields con estilos controlados
 */
const PayPalButton = ({ planType, onSuccess, onError, onCancel, disabled }) => {
  const [clientId, setClientId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('paypal') // 'paypal' o 'card'
  const [cardProcessing, setCardProcessing] = useState(false)

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

  // Capturar pago en el backend (para PayPal buttons)
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

  // Callback cuando card fields aprueba el pago
  const onCardApprove = async (data) => {
    setCardProcessing(true)
    try {
      const response = await paypalApi.captureOrder(data.orderID, planType)
      if (response.success) {
        toast.success(response.message || 'Pago con tarjeta procesado correctamente')
        if (onSuccess) {
          onSuccess(response.data)
        }
      } else {
        throw new Error(response.error || 'Error al procesar el pago')
      }
    } catch (err) {
      console.error('Error capturando pago con tarjeta:', err)
      toast.error(err.message || 'Error al procesar el pago con tarjeta')
      if (onError) {
        onError(err)
      }
    } finally {
      setCardProcessing(false)
    }
  }

  // Manejar errores de PayPal
  const handleError = (err) => {
    console.error('Error de PayPal:', err)
    toast.error('Error en el proceso de pago')
    setCardProcessing(false)
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

  // Estilos para Card Fields - tema claro con texto oscuro
  const cardFieldsStyle = {
    input: {
      'font-size': '16px',
      'font-family': 'Inter, system-ui, sans-serif',
      'font-weight': '400',
      'color': '#1a1a2e',
      'background-color': '#ffffff',
      'border': '1px solid #d1d5db',
      'border-radius': '8px',
      'padding': '12px',
    },
    'input:focus': {
      'border-color': '#40979a',
      'outline': 'none',
    },
    'input::placeholder': {
      'color': '#9ca3af',
    },
    '.invalid': {
      'color': '#dc2626',
      'border-color': '#dc2626',
    }
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId: clientId,
        currency: 'USD',
        intent: 'capture',
        locale: 'es_AR',
        components: 'buttons,card-fields'
      }}
    >
      <div className="paypal-container">
        {/* Selector de método de pago */}
        <div className="payment-method-selector">
          <button
            type="button"
            className={`payment-method-btn ${paymentMethod === 'paypal' ? 'active' : ''}`}
            onClick={() => setPaymentMethod('paypal')}
          >
            <img
              src="https://www.paypalobjects.com/webstatic/icon/pp258.png"
              alt="PayPal"
              className="payment-method-icon"
            />
            <span>PayPal</span>
          </button>
          <button
            type="button"
            className={`payment-method-btn ${paymentMethod === 'card' ? 'active' : ''}`}
            onClick={() => setPaymentMethod('card')}
          >
            <FiCreditCard size={20} />
            <span>Tarjeta</span>
          </button>
        </div>

        {/* PayPal Buttons */}
        {paymentMethod === 'paypal' && (
          <div className="paypal-buttons-wrapper">
            <PayPalButtons
              style={{
                layout: 'vertical',
                color: 'blue',
                shape: 'rect',
                label: 'pay',
                height: 50
              }}
              disabled={disabled}
              createOrder={createOrder}
              onApprove={onApprove}
              onError={handleError}
              onCancel={handleCancel}
            />
          </div>
        )}

        {/* Card Fields */}
        {paymentMethod === 'card' && (
          <div className="card-fields-wrapper">
            <PayPalCardFieldsProvider
              createOrder={createOrder}
              onApprove={onCardApprove}
              onError={handleError}
              style={cardFieldsStyle}
            >
              <PayPalCardFieldsForm />
              <CardFieldsSubmitButton
                disabled={disabled}
                processing={cardProcessing}
              />
            </PayPalCardFieldsProvider>
          </div>
        )}

        <div className="paypal-secure-badge">
          <FiLock size={14} />
          <span>Pago seguro procesado por PayPal</span>
        </div>
      </div>
    </PayPalScriptProvider>
  )
}

export default PayPalButton

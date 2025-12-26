import { useState, useEffect } from 'react'
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js'
import { paypalApi } from '../services/api'
import { toast } from 'react-toastify'
import LoadingSpinner from './LoadingSpinner'
import { FiLock } from 'react-icons/fi'

/**
 * Componente de botón de pago con PayPal
 * El SDK de PayPal incluye automáticamente PayPal y Tarjeta en su popup
 */
const PayPalButton = ({ planType, onSuccess, onError, onCancel, disabled }) => {
  const [clientId, setClientId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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

  return (
    <PayPalScriptProvider
      options={{
        clientId: clientId,
        currency: 'USD',
        intent: 'capture',
        locale: 'es_AR'
      }}
    >
      <div className="paypal-container">
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

        <div className="paypal-secure-badge">
          <FiLock size={14} />
          <span>Pago seguro procesado por PayPal</span>
        </div>
      </div>
    </PayPalScriptProvider>
  )
}

export default PayPalButton

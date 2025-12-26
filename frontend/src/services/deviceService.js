/**
 * Servicio para gestión de dispositivos y sesiones
 */

const DEVICE_ID_KEY = 'bno_device_id';
const SESSION_ID_KEY = 'bno_session_id';

/**
 * Genera un fingerprint básico del dispositivo
 * Combina varios atributos del navegador para crear un ID único
 */
const generateFingerprint = () => {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 'unknown',
    navigator.deviceMemory || 'unknown'
  ];

  // Simple hash function
  let hash = 0;
  const str = components.join('|');
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return Math.abs(hash).toString(36);
};

/**
 * Genera un UUID v4
 */
const generateUUID = () => {
  if (crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback para navegadores sin crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Genera o recupera el deviceId único del dispositivo
 * Persiste en localStorage para mantenerlo entre sesiones
 */
export const getDeviceId = () => {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);

  if (deviceId) {
    return deviceId;
  }

  // Generar nuevo deviceId combinando fingerprint + UUID parcial
  const fingerprint = generateFingerprint();
  const uuid = generateUUID().slice(0, 8);
  deviceId = `${fingerprint}-${uuid}`;

  // Persistir
  localStorage.setItem(DEVICE_ID_KEY, deviceId);

  return deviceId;
};

/**
 * Obtener información del dispositivo
 */
export const getDeviceInfo = () => {
  const ua = navigator.userAgent;

  // Detectar tipo de dispositivo
  let deviceType = 'desktop';
  if (/Mobi|Android/i.test(ua) && !/Tablet|iPad/i.test(ua)) {
    deviceType = 'mobile';
  } else if (/Tablet|iPad/i.test(ua)) {
    deviceType = 'tablet';
  }

  // Detectar navegador
  let browser = 'Desconocido';
  if (ua.includes('Firefox')) {
    browser = 'Firefox';
  } else if (ua.includes('Edg/')) {
    browser = 'Edge';
  } else if (ua.includes('Chrome')) {
    browser = 'Chrome';
  } else if (ua.includes('Safari')) {
    browser = 'Safari';
  } else if (ua.includes('Opera') || ua.includes('OPR')) {
    browser = 'Opera';
  }

  // Detectar OS
  let os = 'Desconocido';
  if (ua.includes('Windows NT 10')) {
    os = 'Windows 10/11';
  } else if (ua.includes('Windows')) {
    os = 'Windows';
  } else if (ua.includes('Mac OS X')) {
    os = 'macOS';
  } else if (ua.includes('Linux') && !ua.includes('Android')) {
    os = 'Linux';
  } else if (ua.includes('Android')) {
    os = 'Android';
  } else if (ua.includes('iPhone') || ua.includes('iPad')) {
    os = 'iOS';
  }

  return {
    browser,
    os,
    deviceType,
    userAgent: ua.substring(0, 200) // Limitar longitud
  };
};

/**
 * Obtener sessionId del almacenamiento
 */
export const getSessionId = () => {
  return localStorage.getItem(SESSION_ID_KEY);
};

/**
 * Guardar sessionId en almacenamiento
 */
export const setSessionId = (sessionId) => {
  if (sessionId) {
    localStorage.setItem(SESSION_ID_KEY, sessionId);
  }
};

/**
 * Limpiar sessionId del almacenamiento
 */
export const clearSessionId = () => {
  localStorage.removeItem(SESSION_ID_KEY);
};

/**
 * Limpiar todos los datos de sesión
 */
export const clearAllSessionData = () => {
  localStorage.removeItem(SESSION_ID_KEY);
  // No eliminamos deviceId porque identifica al dispositivo, no a la sesión
};

export default {
  getDeviceId,
  getDeviceInfo,
  getSessionId,
  setSessionId,
  clearSessionId,
  clearAllSessionData
};

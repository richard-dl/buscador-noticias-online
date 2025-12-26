/**
 * Utilidades para manejo de IP y geolocalización
 */

/**
 * Obtener IP real del cliente considerando proxies/load balancers
 */
const getClientIp = (req) => {
  // Orden de prioridad para headers de IP
  const headers = [
    'cf-connecting-ip',      // Cloudflare
    'x-real-ip',             // Nginx proxy
    'x-forwarded-for',       // Standard proxy header
    'x-client-ip',           // Apache proxy
    'true-client-ip',        // Akamai
  ];

  for (const header of headers) {
    const value = req.headers[header];
    if (value) {
      // x-forwarded-for puede tener múltiples IPs separadas por coma
      const ip = value.split(',')[0].trim();
      if (isValidIp(ip)) {
        return ip;
      }
    }
  }

  // Fallback a connection remote address
  let ip = req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           req.ip ||
           'unknown';

  // Limpiar IPv6 localhost
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    ip = '127.0.0.1';
  }

  // Remover prefijo IPv6-mapped IPv4
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }

  return ip;
};

/**
 * Validar formato de IP (IPv4 o IPv6)
 */
const isValidIp = (ip) => {
  if (!ip || typeof ip !== 'string') return false;

  // IPv4
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(ip)) {
    const parts = ip.split('.');
    return parts.every(part => parseInt(part) <= 255);
  }

  // IPv6 básico
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
  return ipv6Regex.test(ip);
};

/**
 * Obtener información de geolocalización de IP
 * Usa ip-api.com (gratis, 45 requests/min)
 */
const getIpInfo = async (ip) => {
  const defaultInfo = { city: 'Desconocido', country: 'Desconocido' };

  try {
    // Skip para IPs locales/privadas
    if (!ip || ip === 'unknown' || ip === '127.0.0.1' || ip === '::1' ||
        ip.startsWith('192.168.') || ip.startsWith('10.') ||
        ip.startsWith('172.16.') || ip.startsWith('172.17.') ||
        ip.startsWith('172.18.') || ip.startsWith('172.19.') ||
        ip.startsWith('172.2') || ip.startsWith('172.30.') || ip.startsWith('172.31.')) {
      return { city: 'Local', country: 'Red Local' };
    }

    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,city,country&lang=es`,
      { timeout: 3000 }
    );

    if (!response.ok) {
      return defaultInfo;
    }

    const data = await response.json();

    if (data.status === 'success') {
      return {
        city: data.city || 'Desconocido',
        country: data.country || 'Desconocido'
      };
    }

    return defaultInfo;
  } catch (error) {
    console.error('Error obteniendo info de IP:', error.message);
    return defaultInfo;
  }
};

module.exports = {
  getClientIp,
  getIpInfo,
  isValidIp
};

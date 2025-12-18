import axios from 'axios'
import { getIdToken } from './firebase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

// Crear instancia de axios
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Interceptor para agregar token de autenticación
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await getIdToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    } catch (error) {
      console.error('Error obteniendo token:', error)
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptor para manejar respuestas y errores
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.error || error.message || 'Error de conexión'

    // Si es error de suscripción expirada, redirigir
    if (error.response?.data?.code === 'SUBSCRIPTION_EXPIRED') {
      window.location.href = '/expired'
    }

    return Promise.reject({ message, status: error.response?.status })
  }
)

// ============ AUTH ============

export const authApi = {
  register: (userData) => api.post('/auth/register', userData),
  login: () => api.post('/auth/login'),
  verify: () => api.post('/auth/verify'),
  getAllUsers: () => api.get('/auth/users')
}

// ============ USER ============

export const userApi = {
  getProfile: () => api.get('/user/profile'),
  updateProfile: (data) => api.put('/user/profile', data),

  // Search Profiles
  getSearchProfiles: () => api.get('/user/search-profiles'),
  createSearchProfile: (data) => api.post('/user/search-profiles', data),
  updateSearchProfile: (id, data) => api.put(`/user/search-profiles/${id}`, data),
  deleteSearchProfile: (id) => api.delete(`/user/search-profiles/${id}`),

  // Saved News
  getSavedNews: () => api.get('/user/saved-news'),
  saveNews: (data) => api.post('/user/saved-news', data),
  deleteSavedNews: (id) => api.delete(`/user/saved-news/${id}`)
}

// ============ NEWS ============

export const newsApi = {
  getFeeds: () => api.get('/news/feeds'),

  getRssNews: (params = {}) => {
    const queryString = new URLSearchParams(params).toString()
    return api.get(`/news/rss?${queryString}`)
  },

  search: (params = {}) => {
    const queryString = new URLSearchParams(params).toString()
    return api.get(`/news/search?${queryString}`)
  },

  generate: (data) => api.post('/news/generate', data),

  // Extraer imagen de una URL (para noticias de Google News sin imagen)
  // Incluye título para búsqueda alternativa en Bing News
  extractImage: (url, title) => {
    let queryUrl = `/news/extract-image?url=${encodeURIComponent(url)}`
    if (title) {
      queryUrl += `&title=${encodeURIComponent(title)}`
    }
    return api.get(queryUrl)
  },

  // Generar resumen IA de una noticia (para republicación)
  getAISummary: (newsData) => api.post('/news/ai-summary', newsData),

  // Obtener URL del proxy de imágenes (para imágenes que bloquean CORS/referer)
  getProxyImageUrl: (imageUrl) => {
    // Dominios que necesitan proxy
    const needsProxy = [
      'googleusercontent.com',
      'gstatic.com',
      'ggpht.com',
      'news.google.com'
    ]

    const needsProxyCheck = needsProxy.some(domain => imageUrl.includes(domain))

    if (needsProxyCheck) {
      return `${API_URL}/news/proxy-image?url=${encodeURIComponent(imageUrl)}`
    }

    return imageUrl
  }
}

// ============ GEO ============

export const geoApi = {
  getProvincias: () => api.get('/geo/provincias'),
  getDistritosByProvincia: (provinciaId) => api.get(`/geo/distritos/${provinciaId}`),
  getTematicas: () => api.get('/geo/tematicas'),
  getAll: () => api.get('/geo/all')
}

// ============ VIP ============

export const vipApi = {
  getContent: (limit = 50) => api.get(`/vip/content?limit=${limit}`),
  getStatus: () => api.get('/vip/status'),
  deleteContent: (id) => api.delete(`/vip/content/${id}`),
  upgradeUser: (uid, role, vipExpiresAt) => api.post(`/vip/upgrade/${uid}`, { role, vipExpiresAt }),
  // URL para archivos multimedia (usa el proxy del backend)
  getMediaUrl: (fileId) => `${API_URL}/vip/media/${fileId}`
}

export default api

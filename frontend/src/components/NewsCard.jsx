import { useState } from 'react'
import { FiCopy, FiCheck, FiExternalLink, FiImage, FiBookmark, FiTrash2 } from 'react-icons/fi'
import { toast } from 'react-toastify'
import { userApi } from '../services/api'

// Limpiar entidades HTML del texto
const cleanHtmlEntities = (text) => {
  if (!text) return ''
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const NewsCard = ({ news, isSaved = false, onDelete = null, savedNewsId = null }) => {
  const [copied, setCopied] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [saving, setSaving] = useState(false)

  const formatDate = (date) => {
    if (!date) return ''

    // Manejar timestamps de Firestore {_seconds, _nanoseconds}
    let d
    if (date._seconds) {
      d = new Date(date._seconds * 1000)
    } else if (date.seconds) {
      d = new Date(date.seconds * 1000)
    } else {
      d = new Date(date)
    }

    // Verificar que la fecha es válida
    if (isNaN(d.getTime())) return ''

    // Formato: HH:mm - DD/MM/YYYY
    const hours = d.getHours().toString().padStart(2, '0')
    const minutes = d.getMinutes().toString().padStart(2, '0')
    const day = d.getDate().toString().padStart(2, '0')
    const month = (d.getMonth() + 1).toString().padStart(2, '0')
    const year = d.getFullYear()

    return `${hours}:${minutes} - ${day}/${month}/${year}`
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(news.formattedText || generateFormattedText())
      setCopied(true)
      toast.success('Copiado al portapapeles')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error('Error al copiar')
    }
  }

  const generateFormattedText = () => {
    let text = ''
    if (news.category) {
      text += `🟦 ${news.category.toUpperCase()}\n\n`
    }
    text += `📰 ${news.title}\n\n`
    if (news.summary || news.description) {
      text += `📄 ${news.summary || news.description}\n\n`
    }
    if (news.emojisString) {
      text += `🎯 ${news.emojisString}\n\n`
    }
    text += `🔗 ${news.shortUrl || news.link}\n`
    if (news.source) {
      text += `\n📺 Fuente: ${news.source}`
    }
    return text
  }

  const handleSaveNews = async () => {
    if (saving) return

    try {
      setSaving(true)
      await userApi.saveNews({
        title: news.title,
        link: news.link,
        description: news.description || '',
        summary: news.summary || '',
        image: news.image || '',
        source: news.source || '',
        category: news.category || '',
        pubDate: news.pubDate || null,
        emojis: news.emojis || [],
        formattedText: news.formattedText || generateFormattedText(),
        shortUrl: news.shortUrl || ''
      })
      toast.success('Noticia guardada')
    } catch (err) {
      toast.error(err.message || 'Error al guardar noticia')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteNews = async () => {
    if (!savedNewsId || !onDelete) return

    try {
      await userApi.deleteSavedNews(savedNewsId)
      onDelete(savedNewsId)
      toast.success('Noticia eliminada')
    } catch (err) {
      toast.error('Error al eliminar noticia')
    }
  }

  return (
    <article className="news-card">
      <div className="news-card-image">
        {news.image && !imageError ? (
          news.category === 'video' ? (
            <video
              controls
              preload="metadata"
              crossOrigin="anonymous"
              playsInline
              src={news.image}
              onError={() => setImageError(true)}
            />
          ) : (
            <img
              src={news.image}
              alt={news.title}
              onError={() => setImageError(true)}
              loading="lazy"
            />
          )
        ) : (
          <div className="image-placeholder">
            <FiImage size={40} />
          </div>
        )}
        {news.category && news.category !== 'video' && (
          <span className="news-category">{news.category}</span>
        )}
      </div>

      <div className="news-card-content">
        <h3 className="news-title">{cleanHtmlEntities(news.title)}</h3>

        {(news.summary || news.description) && (
          <p className="news-summary">
            {cleanHtmlEntities(news.summary || news.description)}
          </p>
        )}

        {news.emojis && (
          <div className="news-emojis">
            {Array.isArray(news.emojis) ? news.emojis.join(' ') : news.emojis}
          </div>
        )}

        <div className="news-meta">
          <span className="news-source">{news.source}</span>
          <span className="news-date">{formatDate(news.pubDate)}</span>
        </div>

        {news.provincia && (
          <span className="news-location">
            📍 {news.localidad ? `${news.localidad}, ` : ''}{news.provincia}
          </span>
        )}
      </div>

      <div className="news-card-actions">
        <button
          className={`btn-copy ${copied ? 'copied' : ''}`}
          onClick={copyToClipboard}
          title="Copiar texto formateado"
        >
          {copied ? <FiCheck size={18} /> : <FiCopy size={18} />}
          <span>{copied ? 'Copiado' : 'Copiar'}</span>
        </button>

        {isSaved ? (
          <button
            className="btn-delete"
            onClick={handleDeleteNews}
            title="Eliminar noticia guardada"
          >
            <FiTrash2 size={18} />
            <span>Eliminar</span>
          </button>
        ) : (
          <button
            className={`btn-save ${saving ? 'saving' : ''}`}
            onClick={handleSaveNews}
            disabled={saving}
            title="Guardar noticia"
          >
            <FiBookmark size={18} />
            <span>{saving ? 'Guardando...' : 'Guardar'}</span>
          </button>
        )}

        <a
          href={news.link}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-link"
          title="Abrir noticia"
        >
          <FiExternalLink size={18} />
          <span>Ver</span>
        </a>
      </div>
    </article>
  )
}

export default NewsCard

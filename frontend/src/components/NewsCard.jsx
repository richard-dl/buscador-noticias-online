import { useState } from 'react'
import { FiCopy, FiCheck, FiExternalLink, FiImage } from 'react-icons/fi'
import { toast } from 'react-toastify'

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

const NewsCard = ({ news }) => {
  const [copied, setCopied] = useState(false)
  const [imageError, setImageError] = useState(false)

  const formatDate = (date) => {
    if (!date) return ''
    const d = new Date(date)
    return d.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
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

  return (
    <article className="news-card">
      <div className="news-card-image">
        {news.image && !imageError ? (
          <img
            src={news.image}
            alt={news.title}
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <div className="image-placeholder">
            <FiImage size={40} />
          </div>
        )}
        {news.category && (
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

        <a
          href={news.shortUrl || news.link}
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

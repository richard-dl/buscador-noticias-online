import { useState, useEffect } from 'react'
import { FiCopy, FiCheck, FiExternalLink, FiImage, FiBookmark, FiTrash2, FiLoader, FiZap, FiX, FiCode, FiFileText, FiHash } from 'react-icons/fi'
import { toast } from 'react-toastify'
import { userApi, newsApi } from '../services/api'

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

// Cache global para imágenes extraídas (persiste entre renderizados)
// Formato: { image: string|null, timestamp: number }
const extractedImagesCache = new Map()
const CACHE_TTL_POSITIVE = 30 * 60 * 1000 // 30 minutos para imágenes encontradas
const CACHE_TTL_NEGATIVE = 2 * 60 * 1000  // 2 minutos para cache negativo (permite reintentar pronto)

const NewsCard = ({ news, isSaved = false, onDelete = null, savedNewsId = null }) => {
  const [copied, setCopied] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [useProxy, setUseProxy] = useState(false) // Usar proxy si falla la carga directa
  const [saving, setSaving] = useState(false)
  const [extractedImage, setExtractedImage] = useState(null)
  const [loadingImage, setLoadingImage] = useState(false)
  const [retryCount, setRetryCount] = useState(0) // Para forzar re-extracción

  // Estado para modal de resumen IA
  const [showAIModal, setShowAIModal] = useState(false)
  const [aiSummary, setAiSummary] = useState(null)
  const [loadingAI, setLoadingAI] = useState(false)
  const [outputFormat, setOutputFormat] = useState('markdown') // markdown, html, text
  const [copiedFormat, setCopiedFormat] = useState(null)

  // Intentar extraer imagen si no tiene (Google News, RSS sin imagen, etc.)
  useEffect(() => {
    const shouldExtractImage = !news.image && news.link

    if (!shouldExtractImage) return

    // Verificar cache con TTL
    if (extractedImagesCache.has(news.link)) {
      const cached = extractedImagesCache.get(news.link)
      const now = Date.now()
      const ttl = cached.image ? CACHE_TTL_POSITIVE : CACHE_TTL_NEGATIVE

      if (now - cached.timestamp < ttl) {
        // Cache válido
        if (cached.image) setExtractedImage(cached.image)
        return
      } else {
        // Cache expirado, eliminar
        extractedImagesCache.delete(news.link)
      }
    }

    // Extraer imagen del backend (envía título para búsqueda en Bing como fallback)
    const extractImage = async () => {
      setLoadingImage(true)
      try {
        const response = await newsApi.extractImage(news.link, news.title)
        if (response.success && response.image) {
          setExtractedImage(response.image)
          extractedImagesCache.set(news.link, { image: response.image, timestamp: Date.now() })
        } else {
          extractedImagesCache.set(news.link, { image: null, timestamp: Date.now() })
        }
      } catch (err) {
        console.warn('Error extrayendo imagen:', err.message)
        extractedImagesCache.set(news.link, { image: null, timestamp: Date.now() })
      } finally {
        setLoadingImage(false)
      }
    }

    extractImage()
  }, [news.link, news.image, news.sourceType, news.title, retryCount])

  // Imagen a mostrar (original, extraída, o via proxy)
  const rawImage = news.image || extractedImage
  const displayImage = rawImage ? (useProxy ? newsApi.getProxyImageUrl(rawImage) : rawImage) : null

  // Handler para error de imagen - intentar con proxy antes de mostrar placeholder
  const handleImageError = () => {
    if (!useProxy && rawImage) {
      // Intentar con proxy
      console.log('Imagen falló, intentando con proxy:', rawImage.substring(0, 50))
      setUseProxy(true)
    } else {
      // Ya intentamos con proxy, mostrar placeholder
      setImageError(true)
    }
  }

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
        image: displayImage || '', // Usar imagen extraída si está disponible
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

  // Generar resumen IA
  const handleGenerateAISummary = async () => {
    if (loadingAI) return

    setShowAIModal(true)
    setLoadingAI(true)

    try {
      const response = await newsApi.getAISummary({
        title: news.title,
        description: news.description || '',
        source: news.source || '',
        link: news.link || ''
      })

      if (response.success) {
        setAiSummary(response.data)
      } else {
        toast.error(response.error || 'Error al generar resumen')
        setShowAIModal(false)
      }
    } catch (err) {
      toast.error(err.message || 'Error al conectar con IA')
      setShowAIModal(false)
    } finally {
      setLoadingAI(false)
    }
  }

  // Formatear salida según el formato seleccionado
  const getFormattedOutput = () => {
    if (!aiSummary) return ''

    const { headline, lead, body, keyPoints, source, link } = aiSummary

    switch (outputFormat) {
      case 'html':
        return `<article>
  <h1>${headline}</h1>
  <p class="lead"><strong>${lead}</strong></p>
  <div class="body">
    ${body.split('\n\n').map(p => `<p>${p}</p>`).join('\n    ')}
  </div>
  <h3>Puntos clave:</h3>
  <ul>
${keyPoints.map(point => `    <li>${point}</li>`).join('\n')}
  </ul>
${source ? `  <p class="source"><em>Fuente: ${source}</em></p>` : ''}
${link ? `  <p><a href="${link}" target="_blank" rel="noopener">Leer nota original</a></p>` : ''}
</article>`

      case 'text':
        return `${headline}

${lead}

${body}

Puntos clave:
${keyPoints.map(point => `• ${point}`).join('\n')}

${source ? `Fuente: ${source}` : ''}
${link ? `Link: ${link}` : ''}`

      case 'markdown':
      default:
        return `# ${headline}

**${lead}**

${body}

## Puntos clave
${keyPoints.map(point => `- ${point}`).join('\n')}

${source ? `*Fuente: ${source}*` : ''}
${link ? `[Leer nota original](${link})` : ''}`
    }
  }

  // Copiar formato específico
  const copyFormattedOutput = async () => {
    try {
      await navigator.clipboard.writeText(getFormattedOutput())
      setCopiedFormat(outputFormat)
      toast.success(`Copiado en formato ${outputFormat.toUpperCase()}`)
      setTimeout(() => setCopiedFormat(null), 2000)
    } catch (err) {
      toast.error('Error al copiar')
    }
  }

  return (
    <article className="news-card">
      <div className="news-card-image">
        {displayImage && !imageError ? (
          news.category === 'video' ? (
            <video
              controls
              preload="metadata"
              playsInline
              src={displayImage}
              onError={() => setImageError(true)}
            />
          ) : (
            <img
              src={displayImage}
              alt={news.title}
              referrerPolicy="no-referrer"
              onError={handleImageError}
              loading="lazy"
            />
          )
        ) : loadingImage ? (
          <div className="image-placeholder image-loading">
            <FiLoader size={30} className="spinner" />
            <span>Cargando imagen...</span>
          </div>
        ) : (
          <div
            className="image-placeholder image-retry"
            onClick={() => {
              // Limpiar cache y reintentar
              extractedImagesCache.delete(news.link)
              setImageError(false)
              setUseProxy(false)
              setRetryCount(c => c + 1)
            }}
            title="Clic para reintentar cargar imagen"
          >
            <FiImage size={40} />
            <span className="retry-hint">Reintentar</span>
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

        <button
          className="btn-ai"
          onClick={handleGenerateAISummary}
          disabled={loadingAI}
          title="Generar resumen con IA"
        >
          <FiZap size={18} />
          <span>IA</span>
        </button>

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

      {/* Modal de Resumen IA */}
      {showAIModal && (
        <div className="ai-modal-overlay" onClick={() => !loadingAI && setShowAIModal(false)}>
          <div className="ai-modal" onClick={e => e.stopPropagation()}>
            <div className="ai-modal-header">
              <h3><FiZap /> Resumen IA</h3>
              <button
                className="ai-modal-close"
                onClick={() => setShowAIModal(false)}
                disabled={loadingAI}
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="ai-modal-content">
              {loadingAI ? (
                <div className="ai-loading">
                  <FiLoader size={40} className="spinner" />
                  <p>Redactando noticia con Claude IA...</p>
                </div>
              ) : aiSummary ? (
                <>
                  {/* Categoría detectada */}
                  <div className="ai-category">
                    <span className="ai-category-badge">{aiSummary.category}</span>
                    <span className="ai-confidence">
                      {Math.round(aiSummary.confidence * 100)}% confianza
                    </span>
                  </div>

                  {/* Título */}
                  <div className="ai-headline">
                    <h4>Título</h4>
                    <h2>{aiSummary.headline}</h2>
                  </div>

                  {/* Bajada/Copete */}
                  <div className="ai-lead">
                    <h4>Bajada</h4>
                    <p className="lead-text">{aiSummary.lead}</p>
                  </div>

                  {/* Cuerpo */}
                  <div className="ai-body">
                    <h4>Contenido</h4>
                    {aiSummary.body.split('\n\n').map((paragraph, idx) => (
                      <p key={idx}>{paragraph}</p>
                    ))}
                  </div>

                  {/* Puntos clave */}
                  <div className="ai-keypoints">
                    <h4>Puntos clave</h4>
                    <ul>
                      {aiSummary.keyPoints.map((point, idx) => (
                        <li key={idx}>{point}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Selector de formato */}
                  <div className="ai-format-selector">
                    <span>Formato de salida:</span>
                    <div className="format-buttons">
                      <button
                        className={outputFormat === 'markdown' ? 'active' : ''}
                        onClick={() => setOutputFormat('markdown')}
                        title="Markdown"
                      >
                        <FiHash size={16} /> MD
                      </button>
                      <button
                        className={outputFormat === 'html' ? 'active' : ''}
                        onClick={() => setOutputFormat('html')}
                        title="HTML"
                      >
                        <FiCode size={16} /> HTML
                      </button>
                      <button
                        className={outputFormat === 'text' ? 'active' : ''}
                        onClick={() => setOutputFormat('text')}
                        title="Texto plano"
                      >
                        <FiFileText size={16} /> TXT
                      </button>
                    </div>
                  </div>

                  {/* Preview del formato */}
                  <div className="ai-preview">
                    <pre>{getFormattedOutput()}</pre>
                  </div>

                  {/* Botón copiar */}
                  <button
                    className={`ai-copy-btn ${copiedFormat ? 'copied' : ''}`}
                    onClick={copyFormattedOutput}
                  >
                    {copiedFormat ? <FiCheck size={18} /> : <FiCopy size={18} />}
                    {copiedFormat ? 'Copiado!' : `Copiar ${outputFormat.toUpperCase()}`}
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </article>
  )
}

export default NewsCard

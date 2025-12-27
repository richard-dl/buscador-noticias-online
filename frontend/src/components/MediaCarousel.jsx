import { useRef, useEffect, useState } from 'react'

const mediaLogos = [
  // Principales diarios nacionales (logos locales)
  { name: 'Clarín', logo: '/logos/clarin.jpg', url: 'https://www.clarin.com' },
  { name: 'La Nación', logo: '/logos/lanacion.png', url: 'https://www.lanacion.com.ar/' },
  { name: 'Infobae', logo: '/logos/infobae.png', url: 'https://www.infobae.com' },
  { name: 'Perfil', logo: '/logos/perfil.png', url: 'https://www.perfil.com' },
  { name: 'Ámbito', logo: '/logos/ambito.png', url: 'https://www.ambito.com' },
  { name: 'Crónica', logo: '/logos/cronica.png', url: 'https://www.cronica.com.ar' },
  { name: 'Página 12', logo: '/logos/pagina12.jpg', url: 'https://www.pagina12.com.ar' },
  // Canales de TV
  { name: 'TN', logo: '/logos/tn.jpg', url: 'https://tn.com.ar' },
  { name: 'C5N', logo: '/logos/c5n.jpg', url: 'https://www.c5n.com' },
  // Diarios provinciales
  { name: 'La Voz', logo: '/logos/lavoz.jpg', url: 'https://www.lavoz.com.ar' },
  { name: 'El Día', logo: '/logos/eldia.png', url: 'https://www.eldia.com' },
  // Portales digitales
  { name: 'MDZ Online', logo: '/logos/mdz.png', url: 'https://www.mdzol.com' },
  // Deportes
  { name: 'Olé', logo: '/logos/ole.png', url: 'https://www.ole.com.ar' },
  { name: 'ESPN', logo: '/logos/espn.png', url: 'https://www.espn.com.ar' },
]

const MediaCarousel = () => {
  const scrollRef = useRef(null)
  const [isPaused, setIsPaused] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)

  // Auto-scroll animation
  useEffect(() => {
    const scrollContainer = scrollRef.current
    if (!scrollContainer) return

    let animationId
    let scrollPosition = scrollContainer.scrollLeft

    const animate = () => {
      if (!isPaused && !isDragging && scrollContainer) {
        scrollPosition += 0.5

        if (scrollPosition >= scrollContainer.scrollWidth / 2) {
          scrollPosition = 0
        }

        scrollContainer.scrollLeft = scrollPosition
      }
      animationId = requestAnimationFrame(animate)
    }

    animationId = requestAnimationFrame(animate)

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
    }
  }, [isPaused, isDragging])

  // Mouse drag handlers
  const handleMouseDown = (e) => {
    const scrollContainer = scrollRef.current
    if (!scrollContainer) return

    setIsDragging(true)
    setStartX(e.pageX - scrollContainer.offsetLeft)
    setScrollLeft(scrollContainer.scrollLeft)
    scrollContainer.style.cursor = 'grabbing'
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    if (scrollRef.current) {
      scrollRef.current.style.cursor = 'grab'
    }
  }

  const handleMouseMove = (e) => {
    if (!isDragging) return
    e.preventDefault()

    const scrollContainer = scrollRef.current
    if (!scrollContainer) return

    const x = e.pageX - scrollContainer.offsetLeft
    const walk = (x - startX) * 2
    scrollContainer.scrollLeft = scrollLeft - walk
  }

  const handleMouseLeave = () => {
    setIsDragging(false)
    setIsPaused(false)
    if (scrollRef.current) {
      scrollRef.current.style.cursor = 'grab'
    }
  }

  // Duplicar logos para efecto infinito
  const duplicatedLogos = [...mediaLogos, ...mediaLogos]

  return (
    <section className="media-carousel-section">
      <div className="media-carousel-header">
        <h3>Fuentes de Noticias</h3>
        <p>Principales medios de comunicación argentinos</p>
      </div>
      <div className="media-carousel-container">
        <div
          className="media-carousel-track"
          ref={scrollRef}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={handleMouseLeave}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          style={{ cursor: 'grab' }}
        >
          {duplicatedLogos.map((media, index) => (
            <a
              key={`${media.name}-${index}`}
              href={media.url}
              target="_blank"
              rel="noopener noreferrer"
              className="media-logo-item"
              title={media.name}
              onClick={(e) => isDragging && e.preventDefault()}
              draggable={false}
            >
              <img
                src={media.logo}
                alt={media.name}
                loading="lazy"
                draggable={false}
              />
              <span className="media-name">{media.name}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

export default MediaCarousel

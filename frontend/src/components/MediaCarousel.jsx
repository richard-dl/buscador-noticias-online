import { useRef, useEffect, useState } from 'react'

const mediaLogos = [
  { name: 'Clarín', logo: 'https://flipr.com.ar/wp-content/uploads/2021/11/avatar_user_4_1636687901-200x200.jpg', url: 'https://www.clarin.com' },
  { name: 'La Nación', logo: 'https://flipr.com.ar/wp-content/uploads/2021/11/avatar_user_5_1636688100-200x200.png', url: 'https://www.lanacion.com.ar' },
  { name: 'Infobae', logo: 'https://flipr.com.ar/wp-content/uploads/2021/11/avatar_user_7_1636687877-200x200.png', url: 'https://www.infobae.com' },
  { name: 'Perfil', logo: 'https://flipr.com.ar/wp-content/uploads/2021/11/avatar_user_8_1636688161-200x200.png', url: 'https://www.perfil.com' },
  { name: 'Ámbito', logo: 'https://flipr.com.ar/wp-content/uploads/2021/11/avatar_user_9_1636687585-200x200.png', url: 'https://www.ambito.com' },
  { name: 'Crónica', logo: 'https://flipr.com.ar/wp-content/uploads/2021/11/avatar_user_11_1636687975-200x200.png', url: 'https://www.cronica.com.ar' },
  { name: 'La Voz', logo: 'https://flipr.com.ar/wp-content/uploads/2021/12/avatar_user_50_1638450211-200x200.jpg', url: 'https://www.lavoz.com.ar' },
  { name: 'El Día', logo: 'https://flipr.com.ar/wp-content/uploads/2021/12/avatar_user_46_1638448890-200x200.png', url: 'https://www.eldia.com' },
  { name: 'Página 12', logo: 'https://flipr.com.ar/wp-content/uploads/2021/11/avatar_user_10_1636688232-200x200.png', url: 'https://www.pagina12.com.ar' },
  { name: 'TN', logo: 'https://flipr.com.ar/wp-content/uploads/2021/11/avatar_user_17_1636774987-200x200.png', url: 'https://tn.com.ar' },
  { name: 'A24', logo: 'https://flipr.com.ar/wp-content/uploads/2021/11/avatar_user_18_1636775010-200x200.png', url: 'https://www.a24.com' },
  { name: 'Télam', logo: 'https://flipr.com.ar/wp-content/uploads/2021/11/avatar_user_13_1636688309-200x200.png', url: 'https://www.telam.com.ar' },
]

const MediaCarousel = () => {
  const scrollRef = useRef(null)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    const scrollContainer = scrollRef.current
    if (!scrollContainer) return

    let animationId
    let scrollPosition = 0
    const speed = 0.5 // pixels per frame

    const animate = () => {
      if (!isPaused && scrollContainer) {
        scrollPosition += speed

        // Reset cuando llegamos a la mitad (donde están los duplicados)
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
  }, [isPaused])

  // Duplicar logos para efecto infinito
  const duplicatedLogos = [...mediaLogos, ...mediaLogos]

  return (
    <section className="media-carousel-section">
      <div className="media-carousel-header">
        <h3>Fuentes de Noticias</h3>
        <p>Principales medios de comunicación argentinos</p>
      </div>
      <div
        className="media-carousel-container"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="media-carousel-track" ref={scrollRef}>
          {duplicatedLogos.map((media, index) => (
            <a
              key={`${media.name}-${index}`}
              href={media.url}
              target="_blank"
              rel="noopener noreferrer"
              className="media-logo-item"
              title={media.name}
            >
              <img
                src={media.logo}
                alt={media.name}
                loading="lazy"
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

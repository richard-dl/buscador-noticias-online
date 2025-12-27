import { useRef, useEffect, useState } from 'react'

const mediaLogos = [
  // Principales diarios nacionales
  { name: 'Clarín', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Clar%C3%ADn_logo.svg/200px-Clar%C3%ADn_logo.svg.png', url: 'https://www.clarin.com' },
  { name: 'La Nación', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/La-nacion-argentina-logo.svg/200px-La-nacion-argentina-logo.svg.png', url: 'https://www.lanacion.com.ar' },
  { name: 'Infobae', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Infobae_logo.svg/200px-Infobae_logo.svg.png', url: 'https://www.infobae.com' },
  { name: 'Perfil', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Logo-perfil.svg/200px-Logo-perfil.svg.png', url: 'https://www.perfil.com' },
  { name: 'Ámbito', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/%C3%81mbito_Financiero_logo.svg/200px-%C3%81mbito_Financiero_logo.svg.png', url: 'https://www.ambito.com' },
  { name: 'Crónica', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Diario_Cr%C3%B3nica_logo.svg/200px-Diario_Cr%C3%B3nica_logo.svg.png', url: 'https://www.cronica.com.ar' },
  { name: 'Página 12', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Pagina12_logo.svg/200px-Pagina12_logo.svg.png', url: 'https://www.pagina12.com.ar' },
  // Canales de TV
  { name: 'TN', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/TN_Todo_Noticias_Logo_2024.svg/200px-TN_Todo_Noticias_Logo_2024.svg.png', url: 'https://tn.com.ar' },
  { name: 'C5N', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Logo_C5N.svg/200px-Logo_C5N.svg.png', url: 'https://www.c5n.com' },
  { name: 'LN+', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/LN%2B_logo.svg/200px-LN%2B_logo.svg.png', url: 'https://www.lanacion.com.ar/ln-mas' },
  { name: 'A24', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/A24_%28canal_de_TV%29_Logo.svg/200px-A24_%28canal_de_TV%29_Logo.svg.png', url: 'https://www.a24.com' },
  { name: 'Crónica TV', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Cronica_TV_logo.svg/200px-Cronica_TV_logo.svg.png', url: 'https://www.cronicatv.com.ar' },
  // Diarios provinciales
  { name: 'La Voz', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/La_Voz_del_Interior_logo.svg/200px-La_Voz_del_Interior_logo.svg.png', url: 'https://www.lavoz.com.ar' },
  { name: 'El Día', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Logo_Diario_El_D%C3%ADa.svg/200px-Logo_Diario_El_D%C3%ADa.svg.png', url: 'https://www.eldia.com' },
  { name: 'Los Andes', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Diario_Los_Andes_logo.svg/200px-Diario_Los_Andes_logo.svg.png', url: 'https://www.losandes.com.ar' },
  { name: 'La Capital', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/La_Capital_logo.svg/200px-La_Capital_logo.svg.png', url: 'https://www.lacapital.com.ar' },
  // Deportes
  { name: 'TyC Sports', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/TyC_Sports_logo_%282018%29.svg/200px-TyC_Sports_logo_%282018%29.svg.png', url: 'https://www.tycsports.com' },
  { name: 'Olé', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Diario_Ole_logo.svg/200px-Diario_Ole_logo.svg.png', url: 'https://www.ole.com.ar' },
  { name: 'ESPN', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/ESPN_wordmark.svg/200px-ESPN_wordmark.svg.png', url: 'https://www.espn.com.ar' },
  // Portales digitales y económicos
  { name: 'El Cronista', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/El_Cronista_logo.svg/200px-El_Cronista_logo.svg.png', url: 'https://www.cronista.com' },
  { name: 'El Destape', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/El_Destape_logo.svg/200px-El_Destape_logo.svg.png', url: 'https://www.eldestapeweb.com' },
  { name: 'Minuto Uno', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Minutouno_logo.svg/200px-Minutouno_logo.svg.png', url: 'https://www.minutouno.com' },
  { name: 'MDZ Online', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/MDZ_Online_logo.svg/200px-MDZ_Online_logo.svg.png', url: 'https://www.mdzol.com' },
  // Agencias
  { name: 'Télam', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Tel%C3%A1m_2018.svg/200px-Tel%C3%A1m_2018.svg.png', url: 'https://www.telam.com.ar' },
  { name: 'Popular', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Diario_Popular_logo.svg/200px-Diario_Popular_logo.svg.png', url: 'https://www.diariopopular.com.ar' },
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

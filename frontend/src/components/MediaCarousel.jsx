import { useRef, useEffect, useState } from 'react'

const mediaLogos = [
  // Principales diarios nacionales
  { name: 'Clarín', logo: 'https://flipr.com.ar/wp-content/uploads/2021/11/avatar_user_4_1636687901-200x200.jpg', url: 'https://www.clarin.com' },
  { name: 'La Nación', logo: 'https://flipr.com.ar/wp-content/uploads/2021/11/avatar_user_5_1636688100-200x200.png', url: 'https://www.lanacion.com.ar' },
  { name: 'Infobae', logo: 'https://flipr.com.ar/wp-content/uploads/2021/11/avatar_user_7_1636687877-200x200.png', url: 'https://www.infobae.com' },
  { name: 'Perfil', logo: 'https://flipr.com.ar/wp-content/uploads/2021/11/avatar_user_8_1636688161-200x200.png', url: 'https://www.perfil.com' },
  { name: 'Ámbito', logo: 'https://flipr.com.ar/wp-content/uploads/2021/11/avatar_user_9_1636687585-200x200.png', url: 'https://www.ambito.com' },
  { name: 'Crónica', logo: 'https://flipr.com.ar/wp-content/uploads/2021/11/avatar_user_11_1636687975-200x200.png', url: 'https://www.cronica.com.ar' },
  { name: 'Página 12', logo: 'https://flipr.com.ar/wp-content/uploads/2021/12/avatar_user_13_1638450837-200x200.jpg', url: 'https://www.pagina12.com.ar' },
  // Canales de TV
  { name: 'TN', logo: 'https://flipr.com.ar/wp-content/uploads/2025/01/avatar_user_20798_1736779888.jpg', url: 'https://tn.com.ar' },
  { name: 'C5N', logo: 'https://flipr.com.ar/wp-content/uploads/2025/01/avatar_user_20801_1736780047.jpg', url: 'https://www.c5n.com' },
  { name: 'LN+', logo: 'https://flipr.com.ar/wp-content/uploads/2025/01/avatar_user_20799_1736779989.jpg', url: 'https://www.lanacion.com.ar/ln-mas' },
  { name: 'A24', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/A24_%28canal_de_TV%29_Logo.svg/200px-A24_%28canal_de_TV%29_Logo.svg.png', url: 'https://www.a24.com' },
  { name: 'IP Noticias', logo: 'https://flipr.com.ar/wp-content/uploads/2021/11/avatar_user_19_1636775038-200x200.png', url: 'https://www.ipnoticias.ar' },
  // Diarios provinciales
  { name: 'La Voz', logo: 'https://flipr.com.ar/wp-content/uploads/2021/12/avatar_user_50_1638450211-200x200.jpg', url: 'https://www.lavoz.com.ar' },
  { name: 'El Día', logo: 'https://flipr.com.ar/wp-content/uploads/2021/12/avatar_user_46_1638448890-200x200.png', url: 'https://www.eldia.com' },
  { name: 'Los Andes', logo: 'https://flipr.com.ar/wp-content/uploads/2021/12/avatar_user_51_1638450278-200x200.png', url: 'https://www.losandes.com.ar' },
  { name: 'El Litoral', logo: 'https://flipr.com.ar/wp-content/uploads/2021/12/avatar_user_52_1638450340-200x200.png', url: 'https://www.ellitoral.com' },
  { name: 'Río Negro', logo: 'https://flipr.com.ar/wp-content/uploads/2021/12/avatar_user_53_1638450406-200x200.png', url: 'https://www.rionegro.com.ar' },
  { name: 'El Tribuno', logo: 'https://flipr.com.ar/wp-content/uploads/2021/12/avatar_user_54_1638450469-200x200.png', url: 'https://www.eltribuno.com' },
  // Portales digitales
  { name: 'MDZ Online', logo: 'https://flipr.com.ar/wp-content/uploads/2022/02/avatar_user_303_1645733148-200x200.png', url: 'https://www.mdzol.com' },
  { name: 'El Destape', logo: 'https://flipr.com.ar/wp-content/uploads/2021/11/avatar_user_14_1636688357-200x200.png', url: 'https://www.eldestapeweb.com' },
  { name: 'Minuto Uno', logo: 'https://flipr.com.ar/wp-content/uploads/2021/11/avatar_user_15_1636688404-200x200.png', url: 'https://www.minutouno.com' },
  { name: 'TyC Sports', logo: 'https://flipr.com.ar/wp-content/uploads/2021/11/avatar_user_16_1636774958-200x200.png', url: 'https://www.tycsports.com' },
  { name: 'Olé', logo: 'https://flipr.com.ar/wp-content/uploads/2021/11/avatar_user_12_1636688274-200x200.png', url: 'https://www.ole.com.ar' },
  { name: 'El Cronista', logo: 'https://flipr.com.ar/wp-content/uploads/2021/12/avatar_user_47_1638449844-200x200.png', url: 'https://www.cronista.com' },
  { name: 'BAE Negocios', logo: 'https://flipr.com.ar/wp-content/uploads/2021/12/avatar_user_48_1638450082-200x200.png', url: 'https://www.baenegocios.com' },
  { name: 'Chequeado', logo: 'https://flipr.com.ar/wp-content/uploads/2021/12/avatar_user_49_1638450152-200x200.png', url: 'https://chequeado.com' },
  // Agencias y otros
  { name: 'Télam', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Tel%C3%A1m_2018.svg/200px-Tel%C3%A1m_2018.svg.png', url: 'https://www.telam.com.ar' },
  { name: 'NA', logo: 'https://flipr.com.ar/wp-content/uploads/2021/12/avatar_user_55_1638450533-200x200.png', url: 'https://www.noticiasargentinas.com' },
  { name: 'Popular', logo: 'https://flipr.com.ar/wp-content/uploads/2021/12/avatar_user_56_1638450596-200x200.png', url: 'https://www.diariopopular.com.ar' },
  { name: 'La Capital', logo: 'https://flipr.com.ar/wp-content/uploads/2021/12/avatar_user_57_1638450658-200x200.png', url: 'https://www.lacapital.com.ar' },
  { name: 'El Patagónico', logo: 'https://flipr.com.ar/wp-content/uploads/2021/12/avatar_user_58_1638450720-200x200.png', url: 'https://www.elpatagonico.com' },
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

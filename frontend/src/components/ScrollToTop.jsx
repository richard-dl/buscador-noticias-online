import { useState, useEffect } from 'react'
import { FiArrowUp } from 'react-icons/fi'

const ScrollToTop = () => {
  const [showScrollTop, setShowScrollTop] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!showScrollTop) return null

  return (
    <button
      className="scroll-to-top"
      onClick={scrollToTop}
      aria-label="Volver arriba"
    >
      <FiArrowUp size={24} />
    </button>
  )
}

export default ScrollToTop

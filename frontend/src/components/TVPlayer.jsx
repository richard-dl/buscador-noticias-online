import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

const TVPlayer = ({ channel, onError }) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !channel?.url) return;

    setIsLoading(true);
    setError(null);

    // Limpiar instancia HLS anterior
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const playVideo = async () => {
      try {
        // Verificar si es un stream HLS o directo
        const isHlsStream = channel.url.includes('.m3u8') ||
                           channel.url.includes('/play/') ||
                           !channel.url.match(/\.(mp4|webm|ogg)$/i);

        if (isHlsStream && Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 90,
            maxBufferLength: 30,
            maxMaxBufferLength: 600,
            maxBufferSize: 60 * 1000 * 1000,
            maxBufferHole: 0.5,
            startLevel: -1, // Auto quality
            fragLoadingTimeOut: 20000,
            manifestLoadingTimeOut: 20000,
            levelLoadingTimeOut: 20000
          });

          hlsRef.current = hls;

          hls.on(Hls.Events.MEDIA_ATTACHED, () => {
            hls.loadSource(channel.url);
          });

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setIsLoading(false);
            video.play().catch(() => {
              // Autoplay bloqueado, el usuario debe hacer clic
              setIsPlaying(false);
            });
          });

          hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  console.error('Error de red, intentando recuperar...');
                  hls.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  console.error('Error de medios, intentando recuperar...');
                  hls.recoverMediaError();
                  break;
                default:
                  setError('No se puede reproducir este canal. Intenta con otra opción.');
                  setIsLoading(false);
                  if (onError) onError(data);
                  break;
              }
            }
          });

          hls.attachMedia(video);
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // Safari nativo HLS
          video.src = channel.url;
          video.addEventListener('loadedmetadata', () => {
            setIsLoading(false);
            video.play().catch(() => setIsPlaying(false));
          });
        } else {
          // Fallback para otros formatos
          video.src = channel.url;
          video.addEventListener('loadeddata', () => {
            setIsLoading(false);
            video.play().catch(() => setIsPlaying(false));
          });
        }
      } catch (err) {
        setError('Error al cargar el stream');
        setIsLoading(false);
        console.error('Error loading stream:', err);
      }
    };

    playVideo();

    // Eventos del video
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = () => {
      setError('Error de reproducción. Intenta con otra opción del canal.');
      setIsLoading(false);
    };
    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('error', handleError);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('error', handleError);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [channel, onError]);

  const handlePlayClick = () => {
    const video = videoRef.current;
    if (video) {
      if (video.paused) {
        video.play().catch(console.error);
      } else {
        video.pause();
      }
    }
  };

  const handleFullscreen = () => {
    const video = videoRef.current;
    if (video) {
      if (video.requestFullscreen) {
        video.requestFullscreen();
      } else if (video.webkitRequestFullscreen) {
        video.webkitRequestFullscreen();
      } else if (video.msRequestFullscreen) {
        video.msRequestFullscreen();
      }
    }
  };

  return (
    <div className="tv-player-container">
      {/* Header del reproductor */}
      <div className="tv-player-header">
        {channel?.logo && (
          <img
            src={channel.logo}
            alt={channel.name}
            className="tv-player-logo"
            onError={(e) => e.target.style.display = 'none'}
          />
        )}
        <div className="tv-player-info">
          <h2 className="tv-player-title">{channel?.name || 'Selecciona un canal'}</h2>
          {channel?.category && (
            <span className="tv-player-category">{channel.category}</span>
          )}
        </div>
        {isPlaying && <span className="tv-live-badge">EN VIVO</span>}
      </div>

      {/* Video */}
      <div className="tv-video-wrapper">
        <video
          ref={videoRef}
          className="tv-video"
          playsInline
          controls
          poster=""
        />

        {/* Overlay de carga */}
        {isLoading && !error && (
          <div className="tv-loading-overlay">
            <div className="tv-spinner"></div>
            <p>Cargando stream...</p>
          </div>
        )}

        {/* Overlay de error */}
        {error && (
          <div className="tv-error-overlay">
            <div className="tv-error-icon">!</div>
            <p>{error}</p>
            <button onClick={() => window.location.reload()} className="tv-retry-btn">
              Reintentar
            </button>
          </div>
        )}

        {/* Overlay cuando no hay canal seleccionado */}
        {!channel && (
          <div className="tv-placeholder-overlay">
            <div className="tv-placeholder-icon">
              <svg viewBox="0 0 24 24" fill="currentColor" width="64" height="64">
                <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z"/>
              </svg>
            </div>
            <p>Selecciona un canal para comenzar</p>
          </div>
        )}
      </div>

      {/* Controles adicionales */}
      {channel && (
        <div className="tv-controls">
          <button onClick={handlePlayClick} className="tv-control-btn">
            {isPlaying ? (
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>
          <button onClick={handleFullscreen} className="tv-control-btn">
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
              <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default TVPlayer;

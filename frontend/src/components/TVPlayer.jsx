import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import mpegts from 'mpegts.js';

// URL del backend API para el proxy de streaming
const API_URL = import.meta.env.VITE_API_URL || 'https://buscador-noticias-online.vercel.app/api';

// Detectar si es un canal público que no necesita proxy
const isPublicChannel = (url) => {
  if (!url) return false;
  // Los canales públicos son HTTPS y no necesitan proxy (HLS o audio directo)
  return url.startsWith('https://');
};

// Detectar si es un stream de audio (radio)
const isAudioStream = (url, isAudioFlag, category) => {
  if (isAudioFlag) return true;
  // Detectar por categoría de radio
  if (category && category.toLowerCase().includes('radio')) return true;
  if (!url) return false;
  // Detectar por extensión de archivo
  return url.includes('.mp3') || url.includes('.aac') || url.includes('.ogg') ||
         url.includes('livestream-redirect') || url.includes('streamtheworld');
};

// Función para obtener la URL del proxy (solo para canales privados)
const getProxyUrl = (originalUrl) => {
  if (!originalUrl) return null;
  // Canales públicos HTTPS no necesitan proxy
  if (isPublicChannel(originalUrl)) {
    return originalUrl;
  }
  // VITE_API_URL ya incluye /api, así que solo agregamos /tv/stream
  return `${API_URL}/tv/stream?url=${encodeURIComponent(originalUrl)}`;
};

// Detectar tipo de stream
const getStreamType = (url, isAudioFlag, category) => {
  // Primero verificar si es audio (solo para streams de audio directo, no HLS)
  const isDirectAudio = url && (url.includes('.mp3') || url.includes('.aac') || url.includes('.ogg') ||
                                url.includes('livestream-redirect') || url.includes('streamtheworld'));
  if (isAudioFlag || isDirectAudio) {
    return 'audio';
  }
  // Los canales públicos HLS
  if (isPublicChannel(url) && url.includes('.m3u8')) {
    return 'hls';
  }
  if (url.includes('.ts') || url.includes('/live/')) {
    return 'mpegts';
  }
  if (url.includes('.m3u8') || url.includes('/play/')) {
    return 'hls';
  }
  return 'direct';
};

const TVPlayer = ({ channel, onError, playerNumber }) => {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const playerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isAudio, setIsAudio] = useState(false);
  const [showRadioVisual, setShowRadioVisual] = useState(false);

  useEffect(() => {
    // Verificar primero si hay canal y URL
    if (!channel?.url) {
      setIsAudio(false);
      setIsLoading(false);
      return;
    }

    const streamType = getStreamType(channel.url, channel.isAudio, channel.category);
    // isAudioType determina qué reproductor usar (audio element vs video/HLS)
    const isAudioType = streamType === 'audio';
    setIsAudio(isAudioType);

    // Mostrar visualización de radio si es categoría de radio (independiente del tipo de stream)
    const isRadioCategory = channel.category && channel.category.toLowerCase().includes('radio');
    setShowRadioVisual(isRadioCategory || isAudioType);

    const mediaElement = isAudioType ? audioRef.current : videoRef.current;
    if (!mediaElement) return;

    setIsLoading(true);
    setError(null);

    // Limpiar instancia anterior
    if (playerRef.current) {
      if (playerRef.current.destroy) {
        playerRef.current.destroy();
      }
      playerRef.current = null;
    }

    // Si es audio, detener video y viceversa
    if (isAudioType && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = '';
    } else if (!isAudioType && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }

    const playMedia = async () => {
      try {
        const streamUrl = getProxyUrl(channel.url);

        console.log('TVPlayer: Stream type:', streamType);
        console.log('TVPlayer: Using proxy URL:', streamUrl);

        if (streamType === 'audio') {
          // Stream de audio directo (MP3, AAC, etc.)
          console.log('TVPlayer: Using audio element for audio stream');
          const audio = audioRef.current;
          audio.src = streamUrl;

          audio.addEventListener('loadeddata', () => {
            setIsLoading(false);
            audio.play().catch((e) => {
              console.log('Audio: Autoplay blocked:', e.message);
              setIsPlaying(false);
            });
          }, { once: true });

          audio.addEventListener('error', (e) => {
            console.error('Audio error:', e);
            setError('Error al cargar la radio. Intenta con otra estación.');
            setIsLoading(false);
          }, { once: true });

          audio.load();

        } else if (streamType === 'mpegts' && mpegts.isSupported()) {
          // MPEG-TS stream con mpegts.js
          console.log('TVPlayer: Using mpegts.js for MPEG-TS stream');
          const video = videoRef.current;

          const player = mpegts.createPlayer({
            type: 'mpegts',
            url: streamUrl,
            isLive: true,
          }, {
            // Worker para mejor rendimiento
            enableWorker: true,
            // Habilitar buffer de stash para acumular datos
            enableStashBuffer: true,
            // Buffer inicial de 512KB antes de comenzar
            stashInitialSize: 512 * 1024,
            // No perseguir latencia agresivamente (priorizar estabilidad)
            liveBufferLatencyChasing: false,
            // Configuración de buffer más conservadora
            liveBufferLatencyMaxLatency: 5.0,
            liveBufferLatencyMinRemain: 2.0,
            // Deshabilitar seeking automático
            autoCleanupSourceBuffer: true,
            autoCleanupMaxBackwardDuration: 30,
            autoCleanupMinBackwardDuration: 20,
            // Tamaños de buffer más grandes
            fixAudioTimestampGap: true,
            accurateSeek: false,
            seekType: 'range',
            lazyLoad: false,
            lazyLoadMaxDuration: 60,
            lazyLoadRecoverDuration: 30,
          });

          playerRef.current = player;

          player.on(mpegts.Events.ERROR, (errorType, errorDetail, errorInfo) => {
            console.error('MPEGTS Error:', errorType, errorDetail, errorInfo);
            if (errorType === mpegts.ErrorTypes.NETWORK_ERROR) {
              setError('Error de red. Verifica tu conexión.');
            } else if (errorType === mpegts.ErrorTypes.MEDIA_ERROR) {
              // Intentar recuperar de errores de media
              console.log('MPEGTS: Attempting to recover from media error');
              player.unload();
              setTimeout(() => {
                player.load();
                video.play().catch(() => {});
              }, 1000);
              return;
            } else {
              setError('Error al cargar el stream.');
            }
            setIsLoading(false);
            if (onError) onError({ type: errorType, detail: errorDetail });
          });

          player.on(mpegts.Events.LOADING_COMPLETE, () => {
            console.log('MPEGTS: Loading complete');
          });

          player.on(mpegts.Events.MEDIA_INFO, (mediaInfo) => {
            console.log('MPEGTS: Media info received', mediaInfo);
          });

          // Evento cuando hay suficientes datos para reproducir
          player.on(mpegts.Events.STATISTICS_INFO, (stats) => {
            if (stats.speed > 0 && isLoading) {
              console.log('MPEGTS: Buffering stats', stats);
            }
          });

          player.attachMediaElement(video);
          player.load();

          // Esperar más tiempo para que se acumule buffer antes de reproducir
          setTimeout(() => {
            setIsLoading(false);
            video.play().catch((e) => {
              console.log('MPEGTS: Autoplay blocked:', e.message);
              setIsPlaying(false);
            });
          }, 2000);

        } else if (streamType === 'hls' && Hls.isSupported()) {
          // HLS stream con hls.js
          console.log('TVPlayer: Using hls.js for HLS stream');
          const video = videoRef.current;

          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
            backBufferLength: 90,
            maxBufferLength: 30,
            maxMaxBufferLength: 600,
            maxBufferSize: 60 * 1000 * 1000,
            maxBufferHole: 0.5,
            startLevel: -1,
            fragLoadingTimeOut: 30000,
            manifestLoadingTimeOut: 30000,
            levelLoadingTimeOut: 30000,
            debug: false,
            xhrSetup: function(xhr, url) {
              xhr.withCredentials = false;
            }
          });

          playerRef.current = hls;

          hls.on(Hls.Events.MEDIA_ATTACHED, () => {
            console.log('HLS: Media attached, loading source');
            hls.loadSource(streamUrl);
          });

          hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
            console.log('HLS: Manifest parsed, levels:', data.levels?.length);
            setIsLoading(false);
            video.play().catch((e) => {
              console.log('HLS: Autoplay blocked:', e.message);
              setIsPlaying(false);
            });
          });

          hls.on(Hls.Events.ERROR, (event, data) => {
            console.error('HLS Error:', data.type, data.details, data.fatal);
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  console.error('HLS: Network error, retrying...');
                  setTimeout(() => hls.startLoad(), 1000);
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  console.error('HLS: Media error, recovering...');
                  hls.recoverMediaError();
                  break;
                default:
                  console.error('HLS: Fatal error, cannot recover');
                  setError('No se puede reproducir este canal. Intenta con otra opción.');
                  setIsLoading(false);
                  if (onError) onError(data);
                  break;
              }
            }
          });

          hls.attachMedia(video);

        } else {
          const video = videoRef.current;
          if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // Safari nativo HLS
            console.log('TVPlayer: Using native HLS support');
            video.src = streamUrl;
            video.addEventListener('loadedmetadata', () => {
              setIsLoading(false);
              video.play().catch(() => setIsPlaying(false));
            });
          } else {
            // Fallback para otros formatos
            console.log('TVPlayer: Using direct video source');
            video.src = streamUrl;
            video.addEventListener('loadeddata', () => {
              setIsLoading(false);
              video.play().catch(() => setIsPlaying(false));
            });
          }
        }
      } catch (err) {
        setError('Error al cargar el stream');
        setIsLoading(false);
        console.error('Error loading stream:', err);
      }
    };

    playMedia();

    // Eventos del media (video o audio)
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = (e) => {
      console.error('Media error:', e);
      setError(isAudioType ? 'Error de radio. Intenta con otra estación.' : 'Error de reproducción. Intenta con otra opción del canal.');
      setIsLoading(false);
    };
    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);

    // Agregar eventos al elemento correcto (video o audio)
    mediaElement.addEventListener('play', handlePlay);
    mediaElement.addEventListener('pause', handlePause);
    mediaElement.addEventListener('error', handleError);
    mediaElement.addEventListener('waiting', handleWaiting);
    mediaElement.addEventListener('canplay', handleCanPlay);

    return () => {
      mediaElement.removeEventListener('play', handlePlay);
      mediaElement.removeEventListener('pause', handlePause);
      mediaElement.removeEventListener('error', handleError);
      mediaElement.removeEventListener('waiting', handleWaiting);
      mediaElement.removeEventListener('canplay', handleCanPlay);

      if (playerRef.current) {
        if (playerRef.current.destroy) {
          playerRef.current.destroy();
        }
        playerRef.current = null;
      }
    };
  }, [channel, onError]);

  const handlePlayClick = () => {
    const media = isAudio ? audioRef.current : videoRef.current;
    if (media) {
      if (media.paused) {
        media.play().catch(console.error);
      } else {
        media.pause();
      }
    }
  };

  const handleFullscreen = () => {
    const video = videoRef.current;
    // Solo aplica para video, no para audio
    if (video && !isAudio) {
      if (video.requestFullscreen) {
        video.requestFullscreen();
      } else if (video.webkitRequestFullscreen) {
        video.webkitRequestFullscreen();
      } else if (video.msRequestFullscreen) {
        video.msRequestFullscreen();
      }
    }
  };

  const handleMuteClick = () => {
    const media = isAudio ? audioRef.current : videoRef.current;
    if (media) {
      media.muted = !media.muted;
      setIsMuted(media.muted);
    }
  };

  return (
    <div className="tv-player-container">
      {/* Header del reproductor */}
      <div className="tv-player-header">
        {playerNumber && (
          <span className="tv-player-number-badge">{playerNumber}</span>
        )}
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

      {/* Video o Audio */}
      <div className={`tv-video-wrapper ${showRadioVisual ? 'tv-audio-mode' : ''}`}>
        {/* Elemento de video (oculto cuando se muestra radio visual) */}
        <video
          ref={videoRef}
          className="tv-video"
          playsInline
          controls
          poster=""
          style={{ display: showRadioVisual ? 'none' : 'block' }}
        />

        {/* Elemento de audio (oculto cuando es video) */}
        <audio
          ref={audioRef}
          style={{ display: 'none' }}
        />

        {/* Visualización de radio cuando es categoría de radio o audio */}
        {showRadioVisual && channel && !error && (
          <div className="tv-radio-visual">
            <div className="tv-radio-icon">
              <svg viewBox="0 0 24 24" fill="currentColor" width="80" height="80">
                <path d="M3.24 6.15C2.51 6.43 2 7.17 2 8v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2H8.3l8.26-3.34-.37-.92L3.24 6.15zM7 20c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm13-8h-2v-2h-2v2H4V10h16v2z"/>
              </svg>
            </div>
            {channel.logo && (
              <img
                src={channel.logo}
                alt={channel.name}
                className="tv-radio-logo"
                onError={(e) => e.target.style.display = 'none'}
              />
            )}
            <div className="tv-radio-info">
              <span className="tv-radio-name">{channel.name}</span>
              {isPlaying && (
                <div className="tv-radio-waves">
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Overlay de carga */}
        {isLoading && !error && (
          <div className="tv-loading-overlay">
            <div className="tv-spinner"></div>
            <p>{showRadioVisual ? 'Conectando radio...' : 'Cargando stream...'}</p>
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
          <button onClick={handlePlayClick} className="tv-control-btn" title={isPlaying ? 'Pausar' : 'Reproducir'}>
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
          <button onClick={handleMuteClick} className="tv-control-btn" title={isMuted ? 'Activar sonido' : 'Silenciar'}>
            {isMuted ? (
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
              </svg>
            )}
          </button>
          {!showRadioVisual && (
            <button onClick={handleFullscreen} className="tv-control-btn" title="Pantalla completa">
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TVPlayer;

import { useState, useMemo, useEffect } from 'react';
import { toast } from 'react-toastify';
import { channels, getCategories, searchChannels, getChannelById } from '../data/channels';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../services/api';
import TVPlayer from '../components/TVPlayer';
import Header from '../components/Header';
import '../styles/tv.css';

const TVStreaming = () => {
  const { user, isAuthenticated } = useAuth();

  // Estado para dos reproductores independientes
  const [player1Channel, setPlayer1Channel] = useState(null);
  const [player2Channel, setPlayer2Channel] = useState(null);
  const [activePlayer, setActivePlayer] = useState(1); // 1 o 2: indica qué player recibe la selección
  const [activeCategory, setActiveCategory] = useState('Publicos Argentina');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileChannels, setShowMobileChannels] = useState(false);

  // Estado para el modal de favoritos
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);
  const [savingFavorites, setSavingFavorites] = useState(false);
  const [hasFavorites, setHasFavorites] = useState(false);

  // Cargar canales por defecto o favoritos del usuario
  useEffect(() => {
    const loadChannels = async () => {
      // Canales por defecto
      const loadDefaults = () => {
        const publicosArg = channels['Publicos Argentina'] || [];
        const canal26 = publicosArg.find(c => c.id === 'pub-canal26');
        const noticiasChannels = channels['Noticias'] || [];
        const tnOpc2 = noticiasChannels.find(c => c.id === 'tn-opc2');

        if (canal26) setPlayer1Channel({ ...canal26, category: 'Publicos Argentina' });
        if (tnOpc2) setPlayer2Channel({ ...tnOpc2, category: 'Noticias' });
      };

      // Si usuario autenticado, intentar cargar favoritos
      if (isAuthenticated && user) {
        try {
          const response = await userApi.getTvPreferences();
          const prefs = response.data;

          if (prefs) {
            let loaded1 = false;
            let loaded2 = false;

            if (prefs.favoriteChannel1?.id) {
              const ch1 = getChannelById(prefs.favoriteChannel1.id);
              if (ch1) {
                setPlayer1Channel(ch1);
                loaded1 = true;
              }
            }

            if (prefs.favoriteChannel2?.id) {
              const ch2 = getChannelById(prefs.favoriteChannel2.id);
              if (ch2) {
                setPlayer2Channel(ch2);
                loaded2 = true;
              }
            }

            if (loaded1 || loaded2) {
              setHasFavorites(true);
              // Si solo cargo uno, cargar el default del otro
              if (!loaded1) {
                const canal26 = channels['Publicos Argentina']?.find(c => c.id === 'pub-canal26');
                if (canal26) setPlayer1Channel({ ...canal26, category: 'Publicos Argentina' });
              }
              if (!loaded2) {
                const tnOpc2 = channels['Noticias']?.find(c => c.id === 'tn-opc2');
                if (tnOpc2) setPlayer2Channel({ ...tnOpc2, category: 'Noticias' });
              }
              return;
            }
          }
        } catch (error) {
          console.log('Sin favoritos guardados, usando defaults');
        }
      }

      // Fallback: usar canales por defecto
      loadDefaults();
    };

    loadChannels();
  }, [isAuthenticated, user]);

  // Guardar canales actuales como favoritos
  const saveFavorites = async () => {
    if (!isAuthenticated) {
      toast.info('Inicia sesion para guardar tus canales favoritos');
      return;
    }

    setSavingFavorites(true);
    try {
      await userApi.saveTvPreferences({
        channel1: player1Channel ? { id: player1Channel.id, category: player1Channel.category } : null,
        channel2: player2Channel ? { id: player2Channel.id, category: player2Channel.category } : null
      });

      setHasFavorites(true);
      toast.success('Canales favoritos guardados');
      setShowFavoritesModal(false);
    } catch (error) {
      console.error('Error guardando favoritos:', error);
      toast.error('Error al guardar favoritos');
    } finally {
      setSavingFavorites(false);
    }
  };

  const categories = getCategories();

  // Filtrar canales por búsqueda
  const displayedChannels = useMemo(() => {
    if (searchQuery.trim()) {
      return searchChannels(searchQuery);
    }
    return channels[activeCategory] || [];
  }, [searchQuery, activeCategory]);

  const handleChannelSelect = (channel) => {
    const channelWithCategory = { ...channel, category: channel.category || activeCategory };

    // Asignar al reproductor activo
    if (activePlayer === 1) {
      setPlayer1Channel(channelWithCategory);
    } else {
      setPlayer2Channel(channelWithCategory);
    }
    setShowMobileChannels(false);
  };

  // Verificar si un canal está seleccionado en algún reproductor
  const isChannelSelected = (channelId) => {
    return player1Channel?.id === channelId || player2Channel?.id === channelId;
  };

  // Obtener en qué reproductor está un canal
  const getPlayerForChannel = (channelId) => {
    if (player1Channel?.id === channelId) return 1;
    if (player2Channel?.id === channelId) return 2;
    return null;
  };

  const handleCategoryChange = (category) => {
    setActiveCategory(category);
    setSearchQuery('');
  };

  return (
    <>
      <Header />
      <div className="tv-streaming-page">
        {/* Header de la página */}
        <div className="tv-page-header">
          <div className="tv-page-header-left">
            <h1 className="tv-page-title">
              <span className="tv-icon">
                <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
                  <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z"/>
                </svg>
              </span>
              TV en Vivo
            </h1>
            <p className="tv-page-subtitle">Canales de noticias en streaming</p>
          </div>
          <button
            className={`tv-favorites-btn ${hasFavorites ? 'has-favorites' : ''}`}
            onClick={() => setShowFavoritesModal(true)}
            title="Configurar canales favoritos"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
            </svg>
            <span className="tv-favorites-btn-text">Favoritos</span>
          </button>
        </div>

      <div className="tv-content">
        {/* Panel lateral de canales - Desktop */}
        <aside className="tv-sidebar">
          {/* Búsqueda */}
          <div className="tv-search-box">
            <svg className="tv-search-icon" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <input
              type="text"
              placeholder="Buscar canal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="tv-search-input"
            />
            {searchQuery && (
              <button
                className="tv-search-clear"
                onClick={() => setSearchQuery('')}
              >
                ×
              </button>
            )}
          </div>

          {/* Categorías */}
          {!searchQuery && (
            <div className="tv-categories">
              {categories.map((category) => (
                <button
                  key={category}
                  className={`tv-category-btn ${activeCategory === category ? 'active' : ''}`}
                  onClick={() => handleCategoryChange(category)}
                >
                  {category}
                  <span className="tv-category-count">{channels[category].length}</span>
                </button>
              ))}
            </div>
          )}

          {/* Lista de canales */}
          <div className="tv-channel-list">
            {searchQuery && (
              <div className="tv-search-results-header">
                {displayedChannels.length} resultado{displayedChannels.length !== 1 ? 's' : ''}
              </div>
            )}
            {displayedChannels.map((channel) => {
              const playerNum = getPlayerForChannel(channel.id);
              return (
                <button
                  key={channel.id}
                  className={`tv-channel-item ${isChannelSelected(channel.id) ? 'active' : ''}`}
                  onClick={() => handleChannelSelect(channel)}
                >
                  <div className="tv-channel-logo-wrapper">
                    {channel.logo ? (
                      <img
                        src={channel.logo}
                        alt={channel.name}
                        className="tv-channel-logo"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className="tv-channel-logo-placeholder" style={{ display: channel.logo ? 'none' : 'flex' }}>
                      {channel.name.charAt(0)}
                    </div>
                  </div>
                  <div className="tv-channel-info">
                    <span className="tv-channel-name">{channel.name}</span>
                    {searchQuery && channel.category && (
                      <span className="tv-channel-cat">{channel.category}</span>
                    )}
                  </div>
                  {playerNum && (
                    <span className="tv-channel-player-badge">{playerNum}</span>
                  )}
                </button>
              );
            })}
            {displayedChannels.length === 0 && (
              <div className="tv-no-results">
                No se encontraron canales
              </div>
            )}
          </div>
        </aside>

        {/* Área principal con dos reproductores */}
        <main className="tv-main">
          {/* Grid de reproductores */}
          <div className="tv-players-grid">
            <div
              className={`tv-player-wrapper ${activePlayer === 1 ? 'active-selector' : ''}`}
            >
              <TVPlayer
                channel={player1Channel}
                playerNumber={1}
                isActive={activePlayer === 1}
                onActivate={() => setActivePlayer(1)}
              />
            </div>
            <div
              className={`tv-player-wrapper ${activePlayer === 2 ? 'active-selector' : ''}`}
            >
              <TVPlayer
                channel={player2Channel}
                playerNumber={2}
                isActive={activePlayer === 2}
                onActivate={() => setActivePlayer(2)}
              />
            </div>
          </div>

          {/* Info adicional */}
          <p className="tv-stream-note">
            Si el stream no carga, prueba con otra opción del mismo canal (OPC2, OPC3, etc.)
          </p>
        </main>
      </div>

      {/* Botón flotante para mostrar canales en móvil */}
      <button
        className="tv-mobile-toggle"
        onClick={() => setShowMobileChannels(!showMobileChannels)}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
          <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
        </svg>
        Canales
      </button>

      {/* Panel de canales móvil */}
      {showMobileChannels && (
        <div className="tv-mobile-panel">
          <div className="tv-mobile-panel-header">
            <h3>Seleccionar Canal</h3>
            <button onClick={() => setShowMobileChannels(false)} className="tv-mobile-close">
              ×
            </button>
          </div>

          {/* Búsqueda móvil */}
          <div className="tv-search-box">
            <svg className="tv-search-icon" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <input
              type="text"
              placeholder="Buscar canal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="tv-search-input"
            />
          </div>

          {/* Categorías móvil */}
          {!searchQuery && (
            <div className="tv-mobile-categories">
              {categories.map((category) => (
                <button
                  key={category}
                  className={`tv-category-chip ${activeCategory === category ? 'active' : ''}`}
                  onClick={() => handleCategoryChange(category)}
                >
                  {category.replace(' - ', ': ')}
                </button>
              ))}
            </div>
          )}

          {/* Lista de canales móvil */}
          <div className="tv-mobile-channel-list">
            {displayedChannels.map((channel) => {
              const playerNum = getPlayerForChannel(channel.id);
              return (
                <button
                  key={channel.id}
                  className={`tv-channel-item ${isChannelSelected(channel.id) ? 'active' : ''}`}
                  onClick={() => handleChannelSelect(channel)}
                >
                  <div className="tv-channel-logo-wrapper">
                    {channel.logo ? (
                      <img
                        src={channel.logo}
                        alt={channel.name}
                        className="tv-channel-logo"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className="tv-channel-logo-placeholder" style={{ display: channel.logo ? 'none' : 'flex' }}>
                      {channel.name.charAt(0)}
                    </div>
                  </div>
                  <span className="tv-channel-name">{channel.name}</span>
                  {playerNum && (
                    <span className="tv-channel-player-badge">{playerNum}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

        {/* Overlay para cerrar panel móvil */}
        {showMobileChannels && (
          <div className="tv-mobile-overlay" onClick={() => setShowMobileChannels(false)} />
        )}

        {/* Modal de favoritos */}
        {showFavoritesModal && (
          <>
            <div className="tv-favorites-modal-overlay" onClick={() => setShowFavoritesModal(false)} />
            <div className="tv-favorites-modal">
              <div className="tv-favorites-modal-header">
                <h3>Canales Favoritos</h3>
                <button
                  className="tv-favorites-modal-close"
                  onClick={() => setShowFavoritesModal(false)}
                >
                  ×
                </button>
              </div>

              <div className="tv-favorites-modal-body">
                {!isAuthenticated ? (
                  <div className="tv-favorites-login-prompt">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                    </svg>
                    <p>Inicia sesion para guardar tus canales favoritos</p>
                    <p className="tv-favorites-login-subtext">Tus canales favoritos se cargaran automaticamente cada vez que entres a TV en Vivo</p>
                  </div>
                ) : (
                  <>
                    <p className="tv-favorites-description">
                      Guarda los canales actuales como favoritos. Se cargaran automaticamente cuando inicies sesion.
                    </p>

                    <div className="tv-favorites-channels">
                      <div className="tv-favorites-channel-item">
                        <span className="tv-favorites-channel-label">Pantalla 1:</span>
                        <div className="tv-favorites-channel-info">
                          {player1Channel ? (
                            <>
                              {player1Channel.logo && (
                                <img
                                  src={player1Channel.logo}
                                  alt={player1Channel.name}
                                  className="tv-favorites-channel-logo"
                                  onError={(e) => e.target.style.display = 'none'}
                                />
                              )}
                              <span className="tv-favorites-channel-name">{player1Channel.name}</span>
                            </>
                          ) : (
                            <span className="tv-favorites-channel-empty">Sin canal seleccionado</span>
                          )}
                        </div>
                      </div>

                      <div className="tv-favorites-channel-item">
                        <span className="tv-favorites-channel-label">Pantalla 2:</span>
                        <div className="tv-favorites-channel-info">
                          {player2Channel ? (
                            <>
                              {player2Channel.logo && (
                                <img
                                  src={player2Channel.logo}
                                  alt={player2Channel.name}
                                  className="tv-favorites-channel-logo"
                                  onError={(e) => e.target.style.display = 'none'}
                                />
                              )}
                              <span className="tv-favorites-channel-name">{player2Channel.name}</span>
                            </>
                          ) : (
                            <span className="tv-favorites-channel-empty">Sin canal seleccionado</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {hasFavorites && (
                      <p className="tv-favorites-current-note">
                        Ya tienes favoritos guardados. Al guardar, se reemplazaran.
                      </p>
                    )}
                  </>
                )}
              </div>

              <div className="tv-favorites-modal-footer">
                <button
                  className="tv-favorites-cancel-btn"
                  onClick={() => setShowFavoritesModal(false)}
                >
                  Cancelar
                </button>
                {isAuthenticated && (
                  <button
                    className="tv-favorites-save-btn"
                    onClick={saveFavorites}
                    disabled={savingFavorites || (!player1Channel && !player2Channel)}
                  >
                    {savingFavorites ? 'Guardando...' : 'Guardar como favoritos'}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default TVStreaming;

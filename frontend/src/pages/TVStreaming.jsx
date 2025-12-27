import { useState, useMemo, useEffect } from 'react';
import { channels, getCategories, searchChannels } from '../data/channels';
import TVPlayer from '../components/TVPlayer';
import '../styles/tv.css';

const TVStreaming = () => {
  // Estado para dos reproductores independientes
  const [player1Channel, setPlayer1Channel] = useState(null);
  const [player2Channel, setPlayer2Channel] = useState(null);
  const [activePlayer, setActivePlayer] = useState(1); // 1 o 2: indica qué player recibe la selección
  const [activeCategory, setActiveCategory] = useState('Argentina - Noticias');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileChannels, setShowMobileChannels] = useState(false);

  // Cargar canales por defecto al iniciar (TN y C5N)
  useEffect(() => {
    const argChannels = channels['Argentina - Noticias'] || [];
    const tn = argChannels.find(c => c.name.includes('TN'));
    const c5n = argChannels.find(c => c.name.includes('C5N'));

    if (tn) setPlayer1Channel({ ...tn, category: 'Argentina - Noticias' });
    if (c5n) setPlayer2Channel({ ...c5n, category: 'Argentina - Noticias' });
  }, []);

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
    <div className="tv-streaming-page">
      {/* Header de la página */}
      <div className="tv-page-header">
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
          {/* Selector de reproductor activo */}
          <div className="tv-player-selector">
            <span className="tv-selector-label">Enviar canal a:</span>
            <button
              className={`tv-selector-btn ${activePlayer === 1 ? 'active' : ''}`}
              onClick={() => setActivePlayer(1)}
            >
              Pantalla 1
            </button>
            <button
              className={`tv-selector-btn ${activePlayer === 2 ? 'active' : ''}`}
              onClick={() => setActivePlayer(2)}
            >
              Pantalla 2
            </button>
          </div>

          {/* Grid de reproductores */}
          <div className="tv-players-grid">
            <div
              className={`tv-player-wrapper ${activePlayer === 1 ? 'active-selector' : ''}`}
              onClick={() => setActivePlayer(1)}
            >
              <div className="tv-player-number">1</div>
              <TVPlayer channel={player1Channel} />
            </div>
            <div
              className={`tv-player-wrapper ${activePlayer === 2 ? 'active-selector' : ''}`}
              onClick={() => setActivePlayer(2)}
            >
              <div className="tv-player-number">2</div>
              <TVPlayer channel={player2Channel} />
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

          {/* Selector de reproductor en móvil */}
          <div className="tv-mobile-player-selector">
            <span>Enviar a:</span>
            <button
              className={`tv-selector-btn ${activePlayer === 1 ? 'active' : ''}`}
              onClick={() => setActivePlayer(1)}
            >
              Pantalla 1
            </button>
            <button
              className={`tv-selector-btn ${activePlayer === 2 ? 'active' : ''}`}
              onClick={() => setActivePlayer(2)}
            >
              Pantalla 2
            </button>
          </div>

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
    </div>
  );
};

export default TVStreaming;

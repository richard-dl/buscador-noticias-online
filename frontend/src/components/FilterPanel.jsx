import { useState, useEffect } from 'react'
import { FiChevronDown, FiChevronUp, FiX, FiPlus, FiSave } from 'react-icons/fi'
import { geoApi } from '../services/api'

const FilterPanel = ({
  filters,
  onChange,
  onSaveProfile,
  savedProfiles = [],
  selectedProfileId = '',
  onSelectProfile,
  showSaveButton = true,
  collapsed = false  // Permite colapsar todos los filtros desde afuera
}) => {
  const [expanded, setExpanded] = useState({
    tematicas: !collapsed,
    geografia: false,
    keywords: false
  })
  const [geoData, setGeoData] = useState({
    provincias: [],
    distritos: [],
    tematicas: []
  })
  const [loading, setLoading] = useState(true)
  const [keywordInput, setKeywordInput] = useState('')
  const [excludeInput, setExcludeInput] = useState('')
  const [expandedContent, setExpandedContent] = useState(false)

  // Colapsar secciones cuando collapsed=true desde el padre
  useEffect(() => {
    if (collapsed) {
      setExpanded({
        tematicas: false,
        geografia: false,
        keywords: false
      })
      setExpandedContent(false)
    }
  }, [collapsed])

  // Cargar datos geográficos
  useEffect(() => {
    const loadGeoData = async () => {
      try {
        const response = await geoApi.getAll()
        if (response.success) {
          setGeoData({
            provincias: response.data.provincias,
            distritos: response.data.distritos,
            tematicas: response.data.tematicas
          })
        }
      } catch (error) {
        console.error('Error cargando datos geo:', error)
      } finally {
        setLoading(false)
      }
    }
    loadGeoData()
  }, [])

  // Cargar distritos cuando cambia la provincia
  useEffect(() => {
    if (filters.provincia && geoData.distritos[filters.provincia]) {
      // Ya tenemos los distritos cargados
    }
  }, [filters.provincia, geoData.distritos])

  const toggleSection = (section) => {
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const handleTematicaToggle = (tematicaId) => {
    const current = filters.tematicas || []
    const updated = current.includes(tematicaId)
      ? current.filter(t => t !== tematicaId)
      : [...current, tematicaId]
    onChange({ ...filters, tematicas: updated })
  }

  const handleProvinciaChange = (provinciaId) => {
    onChange({
      ...filters,
      provincia: provinciaId,
      distrito: '', // Reset distrito
      localidad: '' // Reset localidad
    })
  }

  const addKeyword = () => {
    if (keywordInput.trim()) {
      const current = filters.keywords || []
      if (!current.includes(keywordInput.trim())) {
        onChange({ ...filters, keywords: [...current, keywordInput.trim()] })
      }
      setKeywordInput('')
    }
  }

  const removeKeyword = (keyword) => {
    const updated = (filters.keywords || []).filter(k => k !== keyword)
    onChange({ ...filters, keywords: updated })
  }

  const addExcludeTerm = () => {
    if (excludeInput.trim()) {
      const current = filters.excludeTerms || []
      if (!current.includes(excludeInput.trim())) {
        onChange({ ...filters, excludeTerms: [...current, excludeInput.trim()] })
      }
      setExcludeInput('')
    }
  }

  const removeExcludeTerm = (term) => {
    const updated = (filters.excludeTerms || []).filter(t => t !== term)
    onChange({ ...filters, excludeTerms: updated })
  }

  const currentDistritos = filters.provincia
    ? geoData.distritos[filters.provincia] || []
    : []

  if (loading) {
    return <div className="filter-panel loading">Cargando filtros...</div>
  }

  return (
    <div className="filter-panel">
      {/* Perfiles guardados */}
      <div className="filter-profiles">
        <label>Perfiles guardados:</label>
        <select
          onChange={(e) => {
            onSelectProfile(e.target.value)
          }}
          value={selectedProfileId}
          disabled={savedProfiles.length === 0}
        >
          <option value="">
            {savedProfiles.length === 0 ? 'No hay perfiles guardados' : 'Seleccionar perfil...'}
          </option>
          {savedProfiles.map(profile => (
            <option key={profile.id} value={profile.id}>
              {profile.name}
            </option>
          ))}
        </select>
      </div>

      {/* Temáticas */}
      <div className="filter-section">
        <button
          className="filter-section-header"
          onClick={() => toggleSection('tematicas')}
        >
          <span>Temáticas</span>
          {expanded.tematicas ? <FiChevronUp /> : <FiChevronDown />}
        </button>
        {expanded.tematicas && (
          <div className="filter-section-content">
            <div className="tematicas-grid">
              {geoData.tematicas.map(tematica => (
                <label
                  key={tematica.id}
                  className={`tematica-chip ${(filters.tematicas || []).includes(tematica.id) ? 'active' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={(filters.tematicas || []).includes(tematica.id)}
                    onChange={() => handleTematicaToggle(tematica.id)}
                  />
                  <span className="icon">{tematica.icon}</span>
                  <span>{tematica.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Geografía */}
      <div className="filter-section">
        <button
          className="filter-section-header"
          onClick={() => toggleSection('geografia')}
        >
          <span>Ubicación Geográfica</span>
          {expanded.geografia ? <FiChevronUp /> : <FiChevronDown />}
        </button>
        {expanded.geografia && (
          <div className="filter-section-content">
            <div className="filter-row">
              <label>Provincia:</label>
              <select
                value={filters.provincia || ''}
                onChange={(e) => handleProvinciaChange(e.target.value)}
              >
                <option value="">Todas las provincias</option>
                {geoData.provincias.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {filters.provincia && currentDistritos.length > 0 && (
              <div className="filter-row">
                <label>Distrito/Partido:</label>
                <select
                  value={filters.distrito || ''}
                  onChange={(e) => onChange({ ...filters, distrito: e.target.value })}
                >
                  <option value="">Todos los distritos</option>
                  {currentDistritos.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="filter-row">
              <label>Localidad (texto libre):</label>
              <input
                type="text"
                value={filters.localidad || ''}
                onChange={(e) => onChange({ ...filters, localidad: e.target.value })}
                placeholder="Ej: Villa María, Tigre..."
              />
            </div>
          </div>
        )}
      </div>

      {/* Tipo de Contenido */}
      <div className="filter-section">
        <button
          className="filter-section-header"
          onClick={() => setExpandedContent(!expandedContent)}
        >
          <span>Tipo de Contenido</span>
          {expandedContent ? <FiChevronUp /> : <FiChevronDown />}
        </button>
        {expandedContent && (
          <div className="filter-section-content">
            <div className="content-type-grid">
              <label className={`content-type-chip ${filters.contentType === 'with-image' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="contentType"
                  value="with-image"
                  checked={filters.contentType === 'with-image'}
                  onChange={(e) => onChange({ ...filters, contentType: e.target.value })}
                />
                <span className="icon">📷</span>
                <span>Solo con Imágenes</span>
              </label>
              <label className={`content-type-chip ${filters.contentType === 'with-video' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="contentType"
                  value="with-video"
                  checked={filters.contentType === 'with-video'}
                  onChange={(e) => onChange({ ...filters, contentType: e.target.value })}
                />
                <span className="icon">🎥</span>
                <span>Solo con Videos</span>
              </label>
              <label className={`content-type-chip ${filters.contentType === 'text-only' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="contentType"
                  value="text-only"
                  checked={filters.contentType === 'text-only'}
                  onChange={(e) => onChange({ ...filters, contentType: e.target.value })}
                />
                <span className="icon">📝</span>
                <span>Solo Texto</span>
              </label>
              <label className={`content-type-chip ${!filters.contentType || filters.contentType === 'all' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="contentType"
                  value="all"
                  checked={!filters.contentType || filters.contentType === 'all'}
                  onChange={(e) => onChange({ ...filters, contentType: e.target.value })}
                />
                <span className="icon">🔄</span>
                <span>Todos</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Keywords */}
      <div className="filter-section">
        <button
          className="filter-section-header"
          onClick={() => toggleSection('keywords')}
        >
          <span>Palabras Clave</span>
          {expanded.keywords ? <FiChevronUp /> : <FiChevronDown />}
        </button>
        {expanded.keywords && (
          <div className="filter-section-content">
            <div className="filter-row">
              <label>Incluir palabras:</label>
              <div className="keyword-input">
                <input
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                  placeholder="Agregar palabra..."
                />
                <button onClick={addKeyword} className="btn-add">
                  <FiPlus />
                </button>
              </div>
              <div className="tags-list">
                {(filters.keywords || []).map(kw => (
                  <span key={kw} className="tag">
                    {kw}
                    <button onClick={() => removeKeyword(kw)}><FiX size={12} /></button>
                  </span>
                ))}
              </div>
            </div>

            <div className="filter-row">
              <label>Excluir palabras:</label>
              <div className="keyword-input">
                <input
                  type="text"
                  value={excludeInput}
                  onChange={(e) => setExcludeInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addExcludeTerm()}
                  placeholder="Excluir palabra..."
                />
                <button onClick={addExcludeTerm} className="btn-add">
                  <FiPlus />
                </button>
              </div>
              <div className="tags-list exclude">
                {(filters.excludeTerms || []).map(term => (
                  <span key={term} className="tag exclude">
                    {term}
                    <button onClick={() => removeExcludeTerm(term)}><FiX size={12} /></button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Botón guardar perfil */}
      {showSaveButton && (
        <button className="btn-save-profile" onClick={onSaveProfile}>
          <FiSave size={16} />
          <span>Guardar como perfil</span>
        </button>
      )}
    </div>
  )
}

export default FilterPanel

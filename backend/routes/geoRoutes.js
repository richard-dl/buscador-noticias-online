const express = require('express');
const router = express.Router();

// Provincias argentinas con sus datos
const PROVINCIAS = [
  { id: 'buenos-aires', name: 'Buenos Aires', capital: 'La Plata' },
  { id: 'caba', name: 'Ciudad Autónoma de Buenos Aires', capital: 'Buenos Aires' },
  { id: 'catamarca', name: 'Catamarca', capital: 'San Fernando del Valle de Catamarca' },
  { id: 'chaco', name: 'Chaco', capital: 'Resistencia' },
  { id: 'chubut', name: 'Chubut', capital: 'Rawson' },
  { id: 'cordoba', name: 'Córdoba', capital: 'Córdoba' },
  { id: 'corrientes', name: 'Corrientes', capital: 'Corrientes' },
  { id: 'entre-rios', name: 'Entre Ríos', capital: 'Paraná' },
  { id: 'formosa', name: 'Formosa', capital: 'Formosa' },
  { id: 'jujuy', name: 'Jujuy', capital: 'San Salvador de Jujuy' },
  { id: 'la-pampa', name: 'La Pampa', capital: 'Santa Rosa' },
  { id: 'la-rioja', name: 'La Rioja', capital: 'La Rioja' },
  { id: 'mendoza', name: 'Mendoza', capital: 'Mendoza' },
  { id: 'misiones', name: 'Misiones', capital: 'Posadas' },
  { id: 'neuquen', name: 'Neuquén', capital: 'Neuquén' },
  { id: 'rio-negro', name: 'Río Negro', capital: 'Viedma' },
  { id: 'salta', name: 'Salta', capital: 'Salta' },
  { id: 'san-juan', name: 'San Juan', capital: 'San Juan' },
  { id: 'san-luis', name: 'San Luis', capital: 'San Luis' },
  { id: 'santa-cruz', name: 'Santa Cruz', capital: 'Río Gallegos' },
  { id: 'santa-fe', name: 'Santa Fe', capital: 'Santa Fe' },
  { id: 'santiago-del-estero', name: 'Santiago del Estero', capital: 'Santiago del Estero' },
  { id: 'tierra-del-fuego', name: 'Tierra del Fuego', capital: 'Ushuaia' },
  { id: 'tucuman', name: 'Tucumán', capital: 'San Miguel de Tucumán' }
];

// Distritos/Partidos principales por provincia (ejemplos principales)
const DISTRITOS = {
  'buenos-aires': [
    { id: 'la-plata', name: 'La Plata' },
    { id: 'mar-del-plata', name: 'Mar del Plata' },
    { id: 'bahia-blanca', name: 'Bahía Blanca' },
    { id: 'quilmes', name: 'Quilmes' },
    { id: 'lomas-de-zamora', name: 'Lomas de Zamora' },
    { id: 'avellaneda', name: 'Avellaneda' },
    { id: 'lanus', name: 'Lanús' },
    { id: 'moron', name: 'Morón' },
    { id: 'san-isidro', name: 'San Isidro' },
    { id: 'tigre', name: 'Tigre' },
    { id: 'pilar', name: 'Pilar' },
    { id: 'san-martin', name: 'San Martín' },
    { id: 'tres-de-febrero', name: 'Tres de Febrero' },
    { id: 'vicente-lopez', name: 'Vicente López' },
    { id: 'la-matanza', name: 'La Matanza' },
    { id: 'merlo', name: 'Merlo' },
    { id: 'moreno', name: 'Moreno' },
    { id: 'florencio-varela', name: 'Florencio Varela' },
    { id: 'berazategui', name: 'Berazategui' },
    { id: 'almirante-brown', name: 'Almirante Brown' }
  ],
  'caba': [
    { id: 'palermo', name: 'Palermo' },
    { id: 'recoleta', name: 'Recoleta' },
    { id: 'belgrano', name: 'Belgrano' },
    { id: 'caballito', name: 'Caballito' },
    { id: 'flores', name: 'Flores' },
    { id: 'almagro', name: 'Almagro' },
    { id: 'san-telmo', name: 'San Telmo' },
    { id: 'la-boca', name: 'La Boca' },
    { id: 'puerto-madero', name: 'Puerto Madero' },
    { id: 'villa-crespo', name: 'Villa Crespo' },
    { id: 'nunez', name: 'Núñez' },
    { id: 'colegiales', name: 'Colegiales' },
    { id: 'villa-urquiza', name: 'Villa Urquiza' },
    { id: 'devoto', name: 'Villa Devoto' },
    { id: 'liniers', name: 'Liniers' }
  ],
  'cordoba': [
    { id: 'cordoba-capital', name: 'Córdoba Capital' },
    { id: 'rio-cuarto', name: 'Río Cuarto' },
    { id: 'villa-maria', name: 'Villa María' },
    { id: 'san-francisco', name: 'San Francisco' },
    { id: 'carlos-paz', name: 'Villa Carlos Paz' },
    { id: 'alta-gracia', name: 'Alta Gracia' },
    { id: 'rio-tercero', name: 'Río Tercero' },
    { id: 'jesus-maria', name: 'Jesús María' },
    { id: 'bell-ville', name: 'Bell Ville' },
    { id: 'cosquin', name: 'Cosquín' }
  ],
  'santa-fe': [
    { id: 'rosario', name: 'Rosario' },
    { id: 'santa-fe-capital', name: 'Santa Fe Capital' },
    { id: 'venado-tuerto', name: 'Venado Tuerto' },
    { id: 'rafaela', name: 'Rafaela' },
    { id: 'reconquista', name: 'Reconquista' },
    { id: 'villa-gobernador-galvez', name: 'Villa Gobernador Gálvez' },
    { id: 'san-lorenzo', name: 'San Lorenzo' },
    { id: 'casilda', name: 'Casilda' }
  ],
  'mendoza': [
    { id: 'mendoza-capital', name: 'Mendoza Capital' },
    { id: 'san-rafael', name: 'San Rafael' },
    { id: 'godoy-cruz', name: 'Godoy Cruz' },
    { id: 'guaymallen', name: 'Guaymallén' },
    { id: 'las-heras', name: 'Las Heras' },
    { id: 'maipu', name: 'Maipú' },
    { id: 'lujan-de-cuyo', name: 'Luján de Cuyo' },
    { id: 'tunuyan', name: 'Tunuyán' }
  ],
  'tucuman': [
    { id: 'san-miguel-de-tucuman', name: 'San Miguel de Tucumán' },
    { id: 'banda-del-rio-sali', name: 'Banda del Río Salí' },
    { id: 'yerba-buena', name: 'Yerba Buena' },
    { id: 'tafi-viejo', name: 'Tafí Viejo' },
    { id: 'concepcion', name: 'Concepción' },
    { id: 'monteros', name: 'Monteros' }
  ],
  'salta': [
    { id: 'salta-capital', name: 'Salta Capital' },
    { id: 'san-ramon-de-la-nueva-oran', name: 'San Ramón de la Nueva Orán' },
    { id: 'tartagal', name: 'Tartagal' },
    { id: 'general-guemes', name: 'General Güemes' },
    { id: 'cafayate', name: 'Cafayate' }
  ]
};

// Temáticas disponibles
const TEMATICAS = [
  { id: 'politica', name: 'Política', icon: '🏛️' },
  { id: 'economia', name: 'Economía', icon: '💰' },
  { id: 'deportes', name: 'Deportes', icon: '⚽' },
  { id: 'espectaculos', name: 'Espectáculos', icon: '🎬' },
  { id: 'tecnologia', name: 'Tecnología', icon: '💻' },
  { id: 'policiales', name: 'Policiales', icon: '🚔' },
  { id: 'salud', name: 'Salud', icon: '🏥' },
  { id: 'educacion', name: 'Educación', icon: '📚' },
  { id: 'cultura', name: 'Cultura', icon: '🎨' },
  { id: 'ciencia', name: 'Ciencia', icon: '🔬' },
  { id: 'medioambiente', name: 'Medio Ambiente', icon: '🌍' },
  { id: 'internacionales', name: 'Internacionales', icon: '🌐' },
  { id: 'sociedad', name: 'Sociedad', icon: '👥' },
  { id: 'turismo', name: 'Turismo', icon: '✈️' },
  // Temáticas por edad
  { id: 'infantil', name: 'Infantil', icon: '👶' },
  { id: 'adolescentes', name: 'Adolescentes', icon: '🧑' },
  { id: 'adultos', name: 'Adultos', icon: '👨' },
  { id: 'adultos-mayores', name: 'Adultos Mayores', icon: '👴' },
  // Temáticas por género
  { id: 'masculino', name: 'Masculino', icon: '👨' },
  { id: 'femenino', name: 'Femenino', icon: '👩' },
  { id: 'genero-diversidad', name: 'Diversidad de Género', icon: '🏳️‍🌈' },
  // Temáticas por religión
  { id: 'religion', name: 'Religión', icon: '⛪' },
  { id: 'catolicismo', name: 'Catolicismo', icon: '✝️' },
  { id: 'judaismo', name: 'Judaísmo', icon: '✡️' },
  { id: 'islam', name: 'Islam', icon: '☪️' },
  { id: 'evangelico', name: 'Evangélico', icon: '📖' }
];

/**
 * GET /api/geo/provincias
 * Obtener lista de provincias argentinas
 */
router.get('/provincias', (req, res) => {
  res.json({
    success: true,
    count: PROVINCIAS.length,
    data: PROVINCIAS
  });
});

/**
 * GET /api/geo/provincias/:id
 * Obtener datos de una provincia específica
 */
router.get('/provincias/:id', (req, res) => {
  const { id } = req.params;
  const provincia = PROVINCIAS.find(p => p.id === id);

  if (!provincia) {
    return res.status(404).json({
      success: false,
      error: 'Provincia no encontrada'
    });
  }

  res.json({
    success: true,
    data: provincia
  });
});

/**
 * GET /api/geo/distritos/:provinciaId
 * Obtener distritos/partidos de una provincia
 */
router.get('/distritos/:provinciaId', (req, res) => {
  const { provinciaId } = req.params;
  const distritos = DISTRITOS[provinciaId] || [];

  res.json({
    success: true,
    count: distritos.length,
    data: distritos
  });
});

/**
 * GET /api/geo/tematicas
 * Obtener lista de temáticas disponibles
 */
router.get('/tematicas', (req, res) => {
  res.json({
    success: true,
    count: TEMATICAS.length,
    data: TEMATICAS
  });
});

/**
 * GET /api/geo/all
 * Obtener todos los datos geográficos y temáticas
 */
router.get('/all', (req, res) => {
  res.json({
    success: true,
    data: {
      provincias: PROVINCIAS,
      distritos: DISTRITOS,
      tematicas: TEMATICAS
    }
  });
});

module.exports = router;

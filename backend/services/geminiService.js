const { GoogleGenerativeAI } = require('@google/generative-ai');

// Inicializar cliente de Gemini
let genAI = null;
let model = null;

const initGemini = () => {
  if (!genAI && process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }
  return model;
};

// Categorías disponibles para clasificación
const CATEGORIAS_DISPONIBLES = [
  'politica',
  'economia',
  'deportes',
  'espectaculos',
  'tecnologia',
  'policiales',
  'judiciales',
  'salud',
  'educacion',
  'cultura',
  'ciencia',
  'medioambiente',
  'internacional',
  'juegos'
];

/**
 * Clasificar una noticia usando IA semántica
 * @param {string} title - Título de la noticia
 * @param {string} description - Descripción de la noticia
 * @returns {Promise<{category: string, confidence: number}>}
 */
const classifyWithAI = async (title, description) => {
  const gemini = initGemini();

  if (!gemini) {
    console.warn('Gemini no configurado, usando clasificación por keywords');
    return null;
  }

  const prompt = `Eres un clasificador de noticias experto. Clasifica la siguiente noticia en UNA SOLA categoría.

CATEGORÍAS DISPONIBLES:
- politica: gobierno, congreso, elecciones, partidos políticos, legislación nacional/provincial
- economia: mercados, dólar, inflación, salarios, impuestos, comercio, finanzas, tarifas, precios
- deportes: fútbol, básquet, tenis, competencias deportivas, atletas, torneos
- espectaculos: farándula, televisión, cine, música, celebridades, entretenimiento
- tecnologia: apps, dispositivos, internet, innovación, startups, IA, software
- policiales: crímenes, robos, asesinatos, policía, seguridad, violencia, narcotráfico
- judiciales: tribunales, jueces, causas judiciales, sentencias, fiscalía, procesos legales
- salud: medicina, hospitales, enfermedades, tratamientos, bienestar, pandemia
- educacion: escuelas, universidades, docentes, estudiantes (NO incluir temas salariales)
- cultura: arte, teatro, literatura, exposiciones, patrimonio cultural
- ciencia: investigación científica, descubrimientos, CONICET, experimentos
- medioambiente: ecología, clima, contaminación, sustentabilidad, cambio climático
- internacional: noticias de otros países, geopolítica, conflictos internacionales, líderes mundiales
- juegos: loterías, quinielas, sorteos, resultados de lotería, números ganadores, azar, apuestas

REGLAS IMPORTANTES:
- Si la noticia habla de SALARIOS, PARITARIAS o AUMENTOS de cualquier sector (docentes, médicos, etc), clasifica como "economia"
- Si hay CRÍMENES o VIOLENCIA aunque involucre profesionales (profesor abusador, médico asesino), clasifica como "policiales"
- Si hay CAUSAS JUDICIALES o TRIBUNALES, clasifica como "judiciales"
- Si involucra PAÍSES EXTRANJEROS o líderes mundiales, clasifica como "internacional"
- Si habla de QUINIELAS, LOTERÍAS, SORTEOS o RESULTADOS de azar, clasifica como "juegos" (NO deportes)

NOTICIA:
Título: ${title}
Descripción: ${description || 'Sin descripción'}

Responde SOLO con un JSON válido en este formato exacto:
{"category": "nombre_categoria", "confidence": 0.95}`;

  try {
    const result = await gemini.generateContent(prompt);
    const response = result.response;
    const text = response.text().trim();

    // Extraer JSON de la respuesta
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      // Validar que la categoría sea válida
      if (CATEGORIAS_DISPONIBLES.includes(parsed.category)) {
        return {
          category: parsed.category,
          confidence: parsed.confidence || 0.9
        };
      }
    }

    console.warn('Respuesta de Gemini no válida:', text);
    return null;
  } catch (error) {
    console.error('Error en clasificación con Gemini:', error.message);
    return null;
  }
};

/**
 * Clasificar múltiples noticias en batch para optimizar llamadas API
 * @param {Array<{title: string, description: string}>} news - Array de noticias
 * @returns {Promise<Array<{category: string, confidence: number}>>}
 */
const classifyBatchWithAI = async (news) => {
  const gemini = initGemini();

  if (!gemini || news.length === 0) {
    return null;
  }

  // Limitar batch a 10 noticias para evitar respuestas muy largas
  const batch = news.slice(0, 10);

  const newsText = batch.map((n, i) =>
    `[${i}] Título: ${n.title}\nDescripción: ${n.description || 'Sin descripción'}`
  ).join('\n\n');

  const prompt = `Eres un clasificador de noticias experto. Clasifica cada una de las siguientes noticias.

CATEGORÍAS DISPONIBLES:
- politica: gobierno, congreso, elecciones, partidos políticos
- economia: mercados, dólar, inflación, salarios, paritarias, impuestos, tarifas, precios
- deportes: fútbol, básquet, tenis, competencias deportivas
- espectaculos: farándula, televisión, cine, música, celebridades
- tecnologia: apps, dispositivos, internet, innovación, IA
- policiales: crímenes, robos, asesinatos, policía, violencia
- judiciales: tribunales, jueces, causas, sentencias, fiscalía
- salud: medicina, hospitales, enfermedades, tratamientos
- educacion: escuelas, universidades, docentes, estudiantes (NO temas salariales)
- cultura: arte, teatro, literatura, exposiciones
- ciencia: investigación científica, descubrimientos
- medioambiente: ecología, clima, contaminación
- internacional: noticias de otros países, geopolítica, líderes mundiales

REGLAS:
- SALARIOS/PARITARIAS de cualquier sector = "economia"
- CRÍMENES/VIOLENCIA = "policiales"
- CAUSAS JUDICIALES = "judiciales"
- PAÍSES EXTRANJEROS = "internacional"

NOTICIAS:
${newsText}

Responde SOLO con un JSON array válido:
[{"index": 0, "category": "categoria", "confidence": 0.95}, ...]`;

  try {
    const result = await gemini.generateContent(prompt);
    const response = result.response;
    const text = response.text().trim();

    // Extraer JSON array de la respuesta
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      // Crear mapa de resultados
      const results = new Array(batch.length).fill(null);

      for (const item of parsed) {
        if (typeof item.index === 'number' &&
            item.index >= 0 &&
            item.index < batch.length &&
            CATEGORIAS_DISPONIBLES.includes(item.category)) {
          results[item.index] = {
            category: item.category,
            confidence: item.confidence || 0.9
          };
        }
      }

      return results;
    }

    return null;
  } catch (error) {
    console.error('Error en clasificación batch con Gemini:', error.message);
    return null;
  }
};

/**
 * Generar resumen inteligente de una noticia
 * @param {string} title - Título de la noticia
 * @param {string} description - Descripción/contenido de la noticia
 * @param {string} source - Fuente de la noticia
 * @returns {Promise<{summary: string, keyPoints: string[]}>}
 */
const generateSummary = async (title, description, source = '') => {
  const gemini = initGemini();

  if (!gemini) {
    return null;
  }

  const prompt = `Eres un periodista experto en redacción de noticias. Genera un resumen conciso y profesional.

NOTICIA:
Título: ${title}
Fuente: ${source || 'No especificada'}
Contenido: ${description || 'Sin contenido adicional'}

INSTRUCCIONES:
1. Escribe un resumen de 2-3 oraciones que capture la esencia de la noticia
2. Usa un tono neutral y profesional
3. Incluye los datos más relevantes (quién, qué, cuándo, dónde si aplica)
4. Extrae 2-3 puntos clave como viñetas

Responde SOLO con un JSON válido:
{
  "summary": "Resumen de 2-3 oraciones aquí",
  "keyPoints": ["Punto clave 1", "Punto clave 2", "Punto clave 3"]
}`;

  try {
    const result = await gemini.generateContent(prompt);
    const response = result.response;
    const text = response.text().trim();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || '',
        keyPoints: parsed.keyPoints || []
      };
    }

    return null;
  } catch (error) {
    console.error('Error generando resumen con Gemini:', error.message);
    return null;
  }
};

/**
 * Procesar noticia completa: clasificar + resumir
 * @param {Object} newsItem - Objeto de noticia con title, description, source
 * @returns {Promise<{category: string, confidence: number, summary: string, keyPoints: string[]}>}
 */
const processNewsWithAI = async (newsItem) => {
  const gemini = initGemini();

  if (!gemini) {
    return null;
  }

  const { title, description, source } = newsItem;

  const prompt = `Eres un experto en análisis de noticias. Analiza la siguiente noticia y proporciona:
1. Clasificación en una categoría
2. Resumen conciso
3. Puntos clave

CATEGORÍAS:
politica, economia, deportes, espectaculos, tecnologia, policiales, judiciales, salud, educacion, cultura, ciencia, medioambiente, internacional

REGLAS DE CLASIFICACIÓN:
- SALARIOS/PARITARIAS/AUMENTOS de cualquier sector = "economia"
- CRÍMENES/VIOLENCIA = "policiales"
- CAUSAS JUDICIALES/TRIBUNALES = "judiciales"
- PAÍSES EXTRANJEROS/LÍDERES MUNDIALES = "internacional"

NOTICIA:
Título: ${title}
Fuente: ${source || 'No especificada'}
Contenido: ${description || 'Sin descripción'}

Responde SOLO con JSON válido:
{
  "category": "nombre_categoria",
  "confidence": 0.95,
  "summary": "Resumen de 2-3 oraciones",
  "keyPoints": ["Punto 1", "Punto 2"]
}`;

  try {
    const result = await gemini.generateContent(prompt);
    const response = result.response;
    const text = response.text().trim();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      if (CATEGORIAS_DISPONIBLES.includes(parsed.category)) {
        return {
          category: parsed.category,
          confidence: parsed.confidence || 0.9,
          summary: parsed.summary || '',
          keyPoints: parsed.keyPoints || []
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error procesando noticia con Gemini:', error.message);
    return null;
  }
};

/**
 * Verificar si Gemini está disponible
 * @returns {boolean}
 */
const isGeminiAvailable = () => {
  return !!process.env.GEMINI_API_KEY;
};

module.exports = {
  classifyWithAI,
  classifyBatchWithAI,
  generateSummary,
  processNewsWithAI,
  isGeminiAvailable,
  CATEGORIAS_DISPONIBLES
};

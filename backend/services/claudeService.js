const Anthropic = require('@anthropic-ai/sdk');

// Inicializar cliente de Claude
let client = null;

const initClaude = () => {
  if (!client && process.env.ANTHROPIC_API_KEY) {
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }
  return client;
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
  'internacional'
];

/**
 * Clasificar una noticia usando Claude AI
 * @param {string} title - Título de la noticia
 * @param {string} description - Descripción de la noticia
 * @returns {Promise<{category: string, confidence: number}|null>}
 */
const classifyWithAI = async (title, description) => {
  const claude = initClaude();

  if (!claude) {
    console.warn('Claude no configurado, usando clasificación por keywords');
    return null;
  }

  const prompt = `Clasifica esta noticia en UNA SOLA categoría.

CATEGORÍAS:
- politica: gobierno, congreso, elecciones, partidos políticos, legislación
- economia: mercados, dólar, inflación, salarios, paritarias, impuestos, tarifas, precios
- deportes: fútbol, básquet, tenis, competencias deportivas, atletas
- espectaculos: farándula, televisión, cine, música, celebridades
- tecnologia: apps, dispositivos, internet, innovación, IA, software
- policiales: crímenes, robos, asesinatos, policía, violencia, narcotráfico
- judiciales: tribunales, jueces, causas judiciales, sentencias, fiscalía
- salud: medicina, hospitales, enfermedades, tratamientos, bienestar
- educacion: escuelas, universidades, docentes, estudiantes (NO temas salariales)
- cultura: arte, teatro, literatura, exposiciones, patrimonio
- ciencia: investigación científica, descubrimientos, CONICET
- medioambiente: ecología, clima, contaminación, sustentabilidad
- internacional: noticias de otros países, geopolítica, líderes mundiales

REGLAS:
- SALARIOS/PARITARIAS de cualquier sector = "economia"
- CRÍMENES/VIOLENCIA = "policiales"
- CAUSAS JUDICIALES = "judiciales"
- PAÍSES EXTRANJEROS = "internacional"

NOTICIA:
Título: ${title}
Descripción: ${description || 'Sin descripción'}

Responde SOLO con JSON: {"category": "nombre", "confidence": 0.95}`;

  try {
    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 100,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (CATEGORIAS_DISPONIBLES.includes(parsed.category)) {
        return {
          category: parsed.category,
          confidence: parsed.confidence || 0.9
        };
      }
    }

    console.warn('Respuesta de Claude no válida:', text);
    return null;
  } catch (error) {
    console.error('Error en clasificación con Claude:', error.message);
    return null;
  }
};

/**
 * Clasificar múltiples noticias en batch
 * @param {Array<{title: string, description: string}>} news
 * @returns {Promise<Array<{category: string, confidence: number}|null>>}
 */
const classifyBatchWithAI = async (news) => {
  const claude = initClaude();

  if (!claude || news.length === 0) {
    return null;
  }

  const batch = news.slice(0, 10);

  const newsText = batch.map((n, i) =>
    `[${i}] Título: ${n.title}\nDescripción: ${n.description || 'Sin descripción'}`
  ).join('\n\n');

  const prompt = `Clasifica cada noticia en una categoría.

CATEGORÍAS: politica, economia, deportes, espectaculos, tecnologia, policiales, judiciales, salud, educacion, cultura, ciencia, medioambiente, internacional

REGLAS:
- SALARIOS/PARITARIAS = "economia"
- CRÍMENES/VIOLENCIA = "policiales"
- CAUSAS JUDICIALES = "judiciales"
- PAÍSES EXTRANJEROS = "internacional"

NOTICIAS:
${newsText}

Responde SOLO con JSON array: [{"index": 0, "category": "cat", "confidence": 0.95}, ...]`;

  try {
    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].text.trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
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
    console.error('Error en clasificación batch con Claude:', error.message);
    return null;
  }
};

/**
 * Generar resumen inteligente de una noticia
 * @param {string} title
 * @param {string} description
 * @param {string} source
 * @returns {Promise<{summary: string, keyPoints: string[]}|null>}
 */
const generateSummary = async (title, description, source = '') => {
  const claude = initClaude();

  if (!claude) {
    return null;
  }

  const prompt = `Resume esta noticia de forma concisa y profesional.

NOTICIA:
Título: ${title}
Fuente: ${source || 'No especificada'}
Contenido: ${description || 'Sin contenido'}

Responde SOLO con JSON:
{
  "summary": "Resumen de 2-3 oraciones",
  "keyPoints": ["Punto 1", "Punto 2"]
}`;

  try {
    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].text.trim();
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
    console.error('Error generando resumen con Claude:', error.message);
    return null;
  }
};

/**
 * Procesar noticia completa: clasificar + resumir
 * @param {Object} newsItem
 * @returns {Promise<{category: string, confidence: number, summary: string, keyPoints: string[]}|null>}
 */
const processNewsWithAI = async (newsItem) => {
  const claude = initClaude();

  if (!claude) {
    return null;
  }

  const { title, description, source } = newsItem;

  const prompt = `Eres un redactor periodístico profesional. Tu tarea es REESCRIBIR esta noticia con formato periodístico completo.

INSTRUCCIONES:
1. Crea un TÍTULO atractivo y conciso (máximo 15 palabras)
2. Escribe una BAJADA/COPETE que resuma lo esencial (1-2 oraciones)
3. Redacta el CUERPO de la noticia (2-3 párrafos informativos)
4. Usa tono informativo, directo y profesional
5. NO uses frases como "La noticia describe...", "Este artículo habla de..."
6. Escribe como si TÚ fueras el periodista reportando el hecho
7. Los puntos clave deben ser HECHOS CONCRETOS

CATEGORÍAS: politica, economia, deportes, espectaculos, tecnologia, policiales, judiciales, salud, educacion, cultura, ciencia, medioambiente, internacional

REGLAS DE CLASIFICACIÓN:
- SALARIOS/PARITARIAS = "economia"
- CRÍMENES/VIOLENCIA = "policiales"
- CAUSAS JUDICIALES = "judiciales"
- PAÍSES EXTRANJEROS = "internacional"

NOTICIA ORIGINAL:
Título: ${title}
Fuente: ${source || 'No especificada'}
Contenido: ${description || 'Sin descripción'}

Responde SOLO con JSON:
{
  "category": "nombre_categoria",
  "confidence": 0.95,
  "headline": "Tu título periodístico",
  "lead": "Tu bajada/copete aquí",
  "body": "El cuerpo de la noticia (2-3 párrafos)",
  "keyPoints": ["Hecho 1", "Hecho 2", "Hecho 3"]
}`;

  try {
    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (CATEGORIAS_DISPONIBLES.includes(parsed.category)) {
        return {
          category: parsed.category,
          confidence: parsed.confidence || 0.9,
          headline: parsed.headline || title,
          lead: parsed.lead || '',
          body: parsed.body || '',
          // Compatibilidad: summary combina lead + body para formatos que lo usen
          summary: parsed.lead && parsed.body
            ? `${parsed.lead}\n\n${parsed.body}`
            : (parsed.summary || ''),
          keyPoints: parsed.keyPoints || []
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error procesando noticia con Claude:', error.message);
    return null;
  }
};

/**
 * Verificar si Claude está disponible
 * @returns {boolean}
 */
const isClaudeAvailable = () => {
  return !!process.env.ANTHROPIC_API_KEY;
};

module.exports = {
  classifyWithAI,
  classifyBatchWithAI,
  generateSummary,
  processNewsWithAI,
  isClaudeAvailable,
  CATEGORIAS_DISPONIBLES
};

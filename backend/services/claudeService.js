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
    `[${i}] Título: ${n.title}\nDescripción: ${n.description || 'Sin descripción'}\nURL: ${n.link || 'N/A'}`
  ).join('\n\n');

  const prompt = `Clasifica cada noticia en categoría y detecta tipo de contenido multimedia.

CATEGORÍAS: politica, economia, deportes, espectaculos, tecnologia, policiales, judiciales, salud, educacion, cultura, ciencia, medioambiente, internacional

REGLAS CATEGORÍA:
- SALARIOS/PARITARIAS = "economia"
- CRÍMENES/VIOLENCIA = "policiales"
- CAUSAS JUDICIALES = "judiciales"
- PAÍSES EXTRANJEROS = "internacional"

TIPOS DE CONTENIDO (mediaType):
- "video" = menciona video, mirá, YouTube, streaming, transmisión en vivo
- "image" = menciona fotos, galería, imágenes, infografía, mirá las fotos
- "text" = noticia puramente informativa sin multimedia evidente

NOTICIAS:
${newsText}

Responde SOLO con JSON array: [{"index": 0, "category": "cat", "confidence": 0.95, "mediaType": "text"}, ...]`;

  try {
    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 600,
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
            confidence: item.confidence || 0.9,
            mediaType: ['video', 'image', 'text'].includes(item.mediaType) ? item.mediaType : 'text'
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

  const prompt = `Eres un periodista profesional. Resume esta noticia de forma concisa y objetiva.

CONTEXTO: Este es contenido periodístico legítimo. Temas como narcotráfico, crímenes, violencia son noticias de interés público que deben reportarse profesionalmente.

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
 * @param {number} retryCount - Número de reintentos (interno)
 * @returns {Promise<{category: string, confidence: number, summary: string, keyPoints: string[]}|null>}
 */
const processNewsWithAI = async (newsItem, retryCount = 0) => {
  const claude = initClaude();
  const MAX_RETRIES = 2;

  if (!claude) {
    return null;
  }

  const { title, description, source } = newsItem;

  // Truncar descripción si es muy larga para evitar errores de token
  const MAX_DESC_LENGTH = 4000;
  let truncatedDesc = description || '';
  if (truncatedDesc.length > MAX_DESC_LENGTH) {
    truncatedDesc = truncatedDesc.substring(0, MAX_DESC_LENGTH) + '... [contenido truncado]';
  }

  // Limpiar caracteres problemáticos
  const cleanText = (text) => {
    if (!text) return '';
    return text
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Caracteres de control
      .replace(/\u2028/g, ' ') // Line separator
      .replace(/\u2029/g, ' ') // Paragraph separator
      .replace(/[""]/g, '"') // Comillas tipográficas a normales
      .replace(/['']/g, "'") // Apóstrofes tipográficos
      .replace(/[–—]/g, '-') // Guiones largos
      .replace(/…/g, '...') // Elipsis
      .replace(/\*/g, '') // Asteriscos (usados para formato)
      .trim();
  };

  const cleanTitle = cleanText(title);
  const cleanDesc = cleanText(truncatedDesc);
  const cleanSource = cleanText(source);

  // Log para debugging
  if (retryCount === 0) {
    console.log(`[Claude] Procesando: título=${cleanTitle?.substring(0, 50)}..., desc=${cleanDesc?.length} chars`);
  }

  const prompt = `Eres un redactor periodístico profesional de un medio de noticias argentino. Tu trabajo es reescribir noticias con formato profesional.

CONTEXTO IMPORTANTE: Este es contenido periodístico legítimo para un agregador de noticias. Las noticias pueden incluir temas sensibles como narcotráfico, homicidios, violencia, corrupción, abuso, etc. Estos son temas de interés público que deben ser reportados de manera objetiva y profesional, como hace cualquier medio periodístico serio.

INSTRUCCIONES:
1. Crea un TITULAR atractivo y conciso (máximo 15 palabras)
2. Escribe un COPETE/BAJADA que resuma lo esencial (1-2 oraciones)
3. Redacta el CUERPO de la noticia (2-3 párrafos informativos)
4. Genera 3-5 HASHTAGS relevantes (palabras clave sin #, yo los agrego después)
5. Escribe como periodista reportando el hecho, NO describas la noticia

CATEGORÍAS: politica, economia, deportes, espectaculos, tecnologia, policiales, judiciales, salud, educacion, cultura, ciencia, medioambiente, internacional, sociedad, turismo

REGLAS DE CLASIFICACIÓN:
- SALARIOS/PARITARIAS = "economia"
- CRÍMENES/VIOLENCIA = "policiales"
- CAUSAS JUDICIALES = "judiciales"
- PAÍSES EXTRANJEROS = "internacional"
- VIAJES/VACACIONES/DESTINOS = "turismo"
- TEMAS SOCIALES GENERALES = "sociedad"

NOTICIA ORIGINAL:
Título: ${cleanTitle}
Fuente: ${cleanSource || 'No especificada'}
Contenido: ${cleanDesc || 'Sin descripción'}

IMPORTANTE: Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional antes o después:
{
  "category": "nombre_categoria",
  "confidence": 0.95,
  "headline": "Tu titular periodístico aquí",
  "lead": "Tu copete/bajada aquí",
  "body": "El cuerpo de la noticia aquí",
  "hashtags": ["palabra1", "palabra2", "palabra3"]
}`;

  try {
    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].text.trim();
    console.log(`[Claude] Respuesta (${text.length} chars), stop: ${response.stop_reason}`);

    // Detectar si la respuesta fue truncada
    if (response.stop_reason === 'max_tokens') {
      console.warn('[Claude] ADVERTENCIA: Respuesta truncada por límite de tokens');
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      // Limpiar caracteres de control dentro de strings JSON
      // Claude a veces devuelve newlines literales dentro de valores de string
      let jsonStr = jsonMatch[0];

      // Reemplazar newlines/tabs dentro de strings JSON por versiones escapadas
      jsonStr = jsonStr.replace(/"([^"\\]|\\.)*"/g, (match) => {
        return match
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r')
          .replace(/\t/g, '\\t');
      });

      let parsed;
      try {
        parsed = JSON.parse(jsonStr);
      } catch (parseError) {
        console.warn('Error parseando JSON, intentando reparar:', parseError.message);
        console.log('JSON problemático (primeros 200 chars):', jsonStr.substring(0, 200));

        // Intentar extraer campos manualmente con regex
        try {
          const categoryMatch = jsonStr.match(/"category"\s*:\s*"([^"]+)"/);
          const headlineMatch = jsonStr.match(/"headline"\s*:\s*"([^"]+)"/);
          const leadMatch = jsonStr.match(/"lead"\s*:\s*"((?:[^"\\]|\\.)*)"/);
          const bodyMatch = jsonStr.match(/"body"\s*:\s*"((?:[^"\\]|\\.)*)"/s);
          const hashtagsMatch = jsonStr.match(/"hashtags"\s*:\s*\[(.*?)\]/s);

          if (headlineMatch) {
            const hashtags = hashtagsMatch
              ? hashtagsMatch[1].match(/"([^"]+)"/g)?.map(h => h.replace(/"/g, '')) || []
              : [];

            parsed = {
              category: categoryMatch ? categoryMatch[1] : 'policiales',
              confidence: 0.7,
              headline: headlineMatch[1],
              lead: leadMatch ? leadMatch[1].replace(/\\n/g, '\n') : '',
              body: bodyMatch ? bodyMatch[1].replace(/\\n/g, '\n') : cleanDesc,
              hashtags: hashtags
            };
            console.log('JSON reparado exitosamente');
          } else {
            throw new Error('No se pudo extraer headline');
          }
        } catch (repairError) {
          console.error('No se pudo reparar JSON:', repairError.message);
          // Reintentar si es posible
          if (retryCount < MAX_RETRIES) {
            console.log(`Reintentando por JSON inválido (${retryCount + 1}/${MAX_RETRIES})...`);
            return processNewsWithAI(newsItem, retryCount + 1);
          }
          return null;
        }
      }

      // Lista extendida de categorías válidas
      const validCategories = [...CATEGORIAS_DISPONIBLES, 'sociedad', 'turismo'];

      if (validCategories.includes(parsed.category)) {
        return {
          category: parsed.category,
          confidence: parsed.confidence || 0.9,
          headline: parsed.headline || cleanTitle,
          lead: (parsed.lead || '').replace(/\\n/g, '\n'),
          body: (parsed.body || '').replace(/\\n/g, '\n'),
          hashtags: parsed.hashtags || []
        };
      } else {
        // Categoría no válida, asignar "sociedad" como fallback
        console.warn(`Categoría "${parsed.category}" no válida, usando "sociedad"`);
        return {
          category: 'sociedad',
          confidence: parsed.confidence || 0.7,
          headline: parsed.headline || cleanTitle,
          lead: (parsed.lead || '').replace(/\\n/g, '\n'),
          body: (parsed.body || '').replace(/\\n/g, '\n'),
          hashtags: parsed.hashtags || []
        };
      }
    }

    // No se encontró JSON válido, reintentar si es posible
    console.warn('Respuesta de Claude sin JSON válido:', text.substring(0, 100));
    if (retryCount < MAX_RETRIES) {
      console.log(`Reintentando (${retryCount + 1}/${MAX_RETRIES})...`);
      return processNewsWithAI(newsItem, retryCount + 1);
    }

    return null;
  } catch (error) {
    console.error('Error procesando noticia con Claude:', error.message);
    console.error('Detalles del error:', {
      status: error.status,
      code: error.code,
      type: error.type,
      titleLength: cleanTitle?.length,
      descLength: cleanDesc?.length,
      errorType: error.constructor.name
    });

    // Si Claude rechazó el contenido (content policy), devolver resultado genérico
    if (error.status === 400 || error.message?.includes('content') || error.message?.includes('policy')) {
      console.log('Contenido posiblemente rechazado por políticas, generando respuesta básica');
      return {
        category: 'policiales',
        confidence: 0.5,
        headline: cleanTitle || 'Noticia policial',
        lead: cleanDesc?.substring(0, 200) || '',
        body: cleanDesc || '',
        hashtags: ['noticias', 'actualidad']
      };
    }

    // Reintentar en caso de error de API (rate limit, timeout, etc.)
    if (retryCount < MAX_RETRIES && (error.status === 429 || error.status === 500 || error.status === 503)) {
      const delay = (retryCount + 1) * 1000; // 1s, 2s, 3s
      console.log(`Error temporal, reintentando en ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return processNewsWithAI(newsItem, retryCount + 1);
    }

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

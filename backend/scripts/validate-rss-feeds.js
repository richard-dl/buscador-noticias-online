/**
 * Script para validar y depurar feeds RSS
 * Verifica: URLs activas, RSS válido, contenido reciente, duplicados
 *
 * Uso: node scripts/validate-rss-feeds.js
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuración
const INPUT_FILE = path.join(__dirname, '../../docs/RSS_listado.txt');
const OUTPUT_DIR = path.join(__dirname, '../../docs');
const TIMEOUT = 10000; // 10 segundos
const CONCURRENCY = 10; // Requests simultáneos
const MAX_AGE_DAYS = 30; // Considerar "abandonado" si no hay noticias en X días

// Estadísticas
const stats = {
  total: 0,
  valid: 0,
  invalid: 0,
  timeout: 0,
  noContent: 0,
  abandoned: 0,
  duplicates: 0
};

// Resultados
const results = {
  valid: [],
  invalid: [],
  abandoned: [],
  duplicates: []
};

/**
 * Parsear el archivo de entrada
 */
const parseInputFile = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const feeds = [];
  const seenUrls = new Set();

  for (const line of lines) {
    // Ignorar líneas vacías, headers y separadores
    if (!line.trim() ||
        line.startsWith('Bloque') ||
        line.startsWith('Provincia|') ||
        !line.includes('|')) {
      continue;
    }

    const parts = line.split('|');
    if (parts.length >= 4) {
      const url = parts[3].trim();

      // Verificar duplicados
      if (seenUrls.has(url)) {
        stats.duplicates++;
        results.duplicates.push({
          provincia: parts[0].trim(),
          ciudad: parts[1].trim(),
          medio: parts[2].trim(),
          url: url
        });
        continue;
      }

      seenUrls.add(url);
      feeds.push({
        provincia: parts[0].trim(),
        ciudad: parts[1].trim(),
        medio: parts[2].trim(),
        url: url
      });
    }
  }

  return feeds;
};

/**
 * Verificar si una URL es un RSS válido
 */
const validateFeed = async (feed) => {
  try {
    const response = await axios.get(feed.url, {
      timeout: TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RSSValidator/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      },
      maxRedirects: 3,
      validateStatus: status => status < 400
    });

    const content = response.data;
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);

    // Verificar que sea XML/RSS
    const isRss = contentStr.includes('<rss') ||
                  contentStr.includes('<feed') ||
                  contentStr.includes('<channel') ||
                  contentStr.includes('<?xml');

    if (!isRss) {
      return {
        ...feed,
        status: 'invalid',
        reason: 'No es un feed RSS válido',
        httpStatus: response.status
      };
    }

    // Verificar si tiene contenido
    const hasItems = contentStr.includes('<item') || contentStr.includes('<entry');
    if (!hasItems) {
      return {
        ...feed,
        status: 'no_content',
        reason: 'RSS sin artículos',
        httpStatus: response.status
      };
    }

    // Intentar extraer fecha más reciente
    const pubDateMatch = contentStr.match(/<pubDate>([^<]+)<\/pubDate>/);
    const updatedMatch = contentStr.match(/<updated>([^<]+)<\/updated>/);
    const dateStr = pubDateMatch?.[1] || updatedMatch?.[1];

    let lastUpdate = null;
    let isAbandoned = false;

    if (dateStr) {
      lastUpdate = new Date(dateStr);
      const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
      isAbandoned = daysSinceUpdate > MAX_AGE_DAYS;
    }

    // Contar items
    const itemCount = (contentStr.match(/<item/g) || contentStr.match(/<entry/g) || []).length;

    return {
      ...feed,
      status: isAbandoned ? 'abandoned' : 'valid',
      reason: isAbandoned ? `Sin actualizaciones en ${MAX_AGE_DAYS}+ días` : 'OK',
      httpStatus: response.status,
      lastUpdate: lastUpdate?.toISOString() || 'Desconocida',
      itemCount
    };

  } catch (error) {
    let reason = 'Error desconocido';
    let status = 'invalid';

    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      reason = 'Timeout - servidor no responde';
      status = 'timeout';
    } else if (error.code === 'ENOTFOUND') {
      reason = 'Dominio no encontrado';
    } else if (error.code === 'ECONNREFUSED') {
      reason = 'Conexión rechazada';
    } else if (error.response) {
      reason = `HTTP ${error.response.status}`;
    } else {
      reason = error.message.substring(0, 100);
    }

    return {
      ...feed,
      status,
      reason,
      httpStatus: error.response?.status || null
    };
  }
};

/**
 * Procesar feeds en lotes
 */
const processBatch = async (feeds, batchSize = CONCURRENCY) => {
  const allResults = [];

  for (let i = 0; i < feeds.length; i += batchSize) {
    const batch = feeds.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(feeds.length / batchSize);

    console.log(`Procesando lote ${batchNum}/${totalBatches} (${batch.length} feeds)...`);

    const batchResults = await Promise.all(batch.map(validateFeed));
    allResults.push(...batchResults);

    // Pequeña pausa entre lotes
    if (i + batchSize < feeds.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return allResults;
};

/**
 * Generar reporte
 */
const generateReport = (allResults) => {
  // Clasificar resultados
  for (const result of allResults) {
    stats.total++;

    switch (result.status) {
      case 'valid':
        stats.valid++;
        results.valid.push(result);
        break;
      case 'abandoned':
        stats.abandoned++;
        results.abandoned.push(result);
        break;
      case 'timeout':
        stats.timeout++;
        results.invalid.push(result);
        break;
      case 'no_content':
        stats.noContent++;
        results.invalid.push(result);
        break;
      default:
        stats.invalid++;
        results.invalid.push(result);
    }
  }

  // Ordenar válidos por provincia
  results.valid.sort((a, b) => {
    if (a.provincia !== b.provincia) return a.provincia.localeCompare(b.provincia);
    if (a.ciudad !== b.ciudad) return a.ciudad.localeCompare(b.ciudad);
    return a.medio.localeCompare(b.medio);
  });

  return { stats, results };
};

/**
 * Guardar resultados
 */
const saveResults = (report) => {
  const timestamp = new Date().toISOString().split('T')[0];

  // 1. Guardar feeds válidos en formato original
  const validContent = results.valid
    .map(f => `${f.provincia}|${f.ciudad}|${f.medio}|${f.url}`)
    .join('\n');

  fs.writeFileSync(
    path.join(OUTPUT_DIR, `RSS_validos_${timestamp}.txt`),
    `Provincia|Ciudad/Región|Medio|Enlace RSS\n${validContent}`
  );

  // 2. Guardar feeds inválidos para revisión
  const invalidContent = results.invalid
    .map(f => `${f.provincia}|${f.ciudad}|${f.medio}|${f.url}|${f.reason}`)
    .join('\n');

  fs.writeFileSync(
    path.join(OUTPUT_DIR, `RSS_invalidos_${timestamp}.txt`),
    `Provincia|Ciudad/Región|Medio|Enlace RSS|Razón\n${invalidContent}`
  );

  // 3. Guardar feeds abandonados
  if (results.abandoned.length > 0) {
    const abandonedContent = results.abandoned
      .map(f => `${f.provincia}|${f.ciudad}|${f.medio}|${f.url}|${f.lastUpdate}`)
      .join('\n');

    fs.writeFileSync(
      path.join(OUTPUT_DIR, `RSS_abandonados_${timestamp}.txt`),
      `Provincia|Ciudad/Región|Medio|Enlace RSS|Última actualización\n${abandonedContent}`
    );
  }

  // 4. Guardar duplicados
  if (results.duplicates.length > 0) {
    const duplicatesContent = results.duplicates
      .map(f => `${f.provincia}|${f.ciudad}|${f.medio}|${f.url}`)
      .join('\n');

    fs.writeFileSync(
      path.join(OUTPUT_DIR, `RSS_duplicados_${timestamp}.txt`),
      `Provincia|Ciudad/Región|Medio|Enlace RSS\n${duplicatesContent}`
    );
  }

  // 5. Guardar JSON con estructura para el backend
  const feedsByProvince = {};
  for (const feed of results.valid) {
    if (!feedsByProvince[feed.provincia]) {
      feedsByProvince[feed.provincia] = [];
    }
    feedsByProvince[feed.provincia].push({
      ciudad: feed.ciudad,
      medio: feed.medio,
      url: feed.url,
      itemCount: feed.itemCount
    });
  }

  fs.writeFileSync(
    path.join(OUTPUT_DIR, `RSS_feeds_${timestamp}.json`),
    JSON.stringify(feedsByProvince, null, 2)
  );

  // 6. Reporte resumen
  const summaryLines = [
    '═══════════════════════════════════════════════════════════════',
    '           REPORTE DE VALIDACIÓN DE FEEDS RSS',
    `           Fecha: ${new Date().toLocaleString('es-AR')}`,
    '═══════════════════════════════════════════════════════════════',
    '',
    'ESTADÍSTICAS GENERALES:',
    `  Total de feeds analizados: ${stats.total + stats.duplicates}`,
    `  Duplicados eliminados:     ${stats.duplicates}`,
    `  Feeds únicos analizados:   ${stats.total}`,
    '',
    'RESULTADOS:',
    `  ✅ Válidos y activos:      ${stats.valid} (${(stats.valid/stats.total*100).toFixed(1)}%)`,
    `  ⚠️  Abandonados (>${MAX_AGE_DAYS}d):   ${stats.abandoned} (${(stats.abandoned/stats.total*100).toFixed(1)}%)`,
    `  ❌ Inválidos/Error:        ${stats.invalid} (${(stats.invalid/stats.total*100).toFixed(1)}%)`,
    `     - Timeout:              ${stats.timeout}`,
    `     - Sin contenido:        ${stats.noContent}`,
    `     - Otros errores:        ${stats.invalid - stats.timeout - stats.noContent}`,
    '',
    'FEEDS POR PROVINCIA (válidos):',
  ];

  // Contar por provincia
  const countByProvince = {};
  for (const feed of results.valid) {
    countByProvince[feed.provincia] = (countByProvince[feed.provincia] || 0) + 1;
  }

  Object.entries(countByProvince)
    .sort((a, b) => b[1] - a[1])
    .forEach(([prov, count]) => {
      summaryLines.push(`  ${prov}: ${count} feeds`);
    });

  summaryLines.push('');
  summaryLines.push('ARCHIVOS GENERADOS:');
  summaryLines.push(`  - RSS_validos_${timestamp}.txt`);
  summaryLines.push(`  - RSS_invalidos_${timestamp}.txt`);
  if (results.abandoned.length > 0) {
    summaryLines.push(`  - RSS_abandonados_${timestamp}.txt`);
  }
  if (results.duplicates.length > 0) {
    summaryLines.push(`  - RSS_duplicados_${timestamp}.txt`);
  }
  summaryLines.push(`  - RSS_feeds_${timestamp}.json`);
  summaryLines.push('');
  summaryLines.push('═══════════════════════════════════════════════════════════════');

  const summary = summaryLines.join('\n');

  fs.writeFileSync(
    path.join(OUTPUT_DIR, `RSS_reporte_${timestamp}.txt`),
    summary
  );

  console.log('\n' + summary);
};

/**
 * Main
 */
const main = async () => {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('           VALIDADOR DE FEEDS RSS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Verificar archivo de entrada
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Error: No se encontró el archivo ${INPUT_FILE}`);
    process.exit(1);
  }

  // Parsear feeds
  console.log('Leyendo archivo de feeds...');
  const feeds = parseInputFile(INPUT_FILE);
  console.log(`Encontrados ${feeds.length} feeds únicos (${stats.duplicates} duplicados eliminados)\n`);

  // Validar feeds
  console.log('Validando feeds (esto puede tomar varios minutos)...\n');
  const startTime = Date.now();
  const allResults = await processBatch(feeds);
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\nValidación completada en ${duration} segundos`);

  // Generar y guardar reporte
  const report = generateReport(allResults);
  saveResults(report);

  console.log('\n¡Proceso completado!');
};

main().catch(console.error);

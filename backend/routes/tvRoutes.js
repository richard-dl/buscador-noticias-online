const express = require('express');
const router = express.Router();
const http = require('http');
const https = require('https');

/**
 * Proxy para streams de TV
 * Necesario para evitar Mixed Content (HTTPS frontend -> HTTP streaming server)
 */

// Función para hacer fetch con seguimiento de redirects
const fetchWithRedirects = (url, maxRedirects = 5) => {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) {
      return reject(new Error('Demasiados redirects'));
    }

    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;

    const req = protocol.request(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
        'Accept-Language': 'es-ES,es;q=0.9',
      },
      timeout: 30000
    }, (res) => {
      // Seguir redirects internamente
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        // Si es URL relativa, construir absoluta
        if (!redirectUrl.startsWith('http')) {
          redirectUrl = `${urlObj.protocol}//${urlObj.host}${redirectUrl}`;
        }
        console.log(`TV Proxy: Redirect ${res.statusCode} -> ${redirectUrl}`);
        return fetchWithRedirects(redirectUrl, maxRedirects - 1)
          .then(resolve)
          .catch(reject);
      }

      // Recolectar datos
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks),
          finalUrl: url
        });
      });
      res.on('error', reject);
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    req.end();
  });
};

// Función para hacer streaming con seguimiento de redirects
const streamWithRedirects = (url, res, maxRedirects = 5) => {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) {
      return reject(new Error('Demasiados redirects'));
    }

    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;

    const req = protocol.request(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
      },
      timeout: 30000
    }, (proxyRes) => {
      // Seguir redirects internamente
      if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
        let redirectUrl = proxyRes.headers.location;
        if (!redirectUrl.startsWith('http')) {
          redirectUrl = `${urlObj.protocol}//${urlObj.host}${redirectUrl}`;
        }
        console.log(`TV Proxy Stream: Redirect ${proxyRes.statusCode} -> ${redirectUrl}`);
        return streamWithRedirects(redirectUrl, res, maxRedirects - 1)
          .then(resolve)
          .catch(reject);
      }

      // Configurar headers y hacer pipe
      res.set({
        'Content-Type': proxyRes.headers['content-type'] || 'video/mp2t',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache'
      });

      proxyRes.pipe(res);
      proxyRes.on('end', resolve);
      proxyRes.on('error', reject);
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    req.end();
  });
};

// Lista de hosts permitidos
const allowedHosts = ['vionixtv.lat', '154.51.248.32'];

const isAllowedHost = (url) => {
  try {
    const urlObj = new URL(url);
    return allowedHosts.some(host => urlObj.hostname.includes(host));
  } catch {
    return false;
  }
};

// Función para streaming MPEG-TS en vivo (sin buffering completo)
const streamLiveTS = (url, res, maxRedirects = 5) => {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) {
      return reject(new Error('Demasiados redirects'));
    }

    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;

    const req = protocol.request(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
        'Connection': 'keep-alive',
      },
      timeout: 0 // Sin timeout para streams en vivo
    }, (proxyRes) => {
      // Seguir redirects
      if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
        let redirectUrl = proxyRes.headers.location;
        if (!redirectUrl.startsWith('http')) {
          redirectUrl = `${urlObj.protocol}//${urlObj.host}${redirectUrl}`;
        }
        console.log(`TV Live Stream: Redirect -> ${redirectUrl}`);
        return streamLiveTS(redirectUrl, res, maxRedirects - 1)
          .then(resolve)
          .catch(reject);
      }

      if (proxyRes.statusCode !== 200) {
        return reject(new Error(`HTTP ${proxyRes.statusCode}`));
      }

      // Headers para streaming en vivo
      res.set({
        'Content-Type': 'video/mp2t',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store',
        'Connection': 'keep-alive',
        'Transfer-Encoding': 'chunked'
      });

      // Pipe directo sin buffering
      proxyRes.pipe(res, { end: true });

      proxyRes.on('end', () => {
        console.log('TV Live Stream: Stream ended');
        resolve();
      });

      proxyRes.on('error', (err) => {
        console.error('TV Live Stream error:', err.message);
        reject(err);
      });

      // Cuando el cliente cierra la conexión
      res.on('close', () => {
        console.log('TV Live Stream: Client disconnected');
        proxyRes.destroy();
        req.destroy();
      });
    });

    req.on('error', (err) => {
      console.error('TV Live Stream request error:', err.message);
      reject(err);
    });

    req.end();
  });
};

// Proxy para streams de TV
router.get('/stream', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL requerida' });
  }

  if (!isAllowedHost(url)) {
    return res.status(403).json({ error: 'Host no permitido' });
  }

  try {
    // Detectar si es un stream MPEG-TS en vivo
    const isLiveTS = url.includes('.ts') || url.includes('/live/');

    if (isLiveTS) {
      // Stream MPEG-TS en vivo - usar pipe directo
      console.log('TV Proxy: Live TS stream ->', url);
      await streamLiveTS(url, res);
      return;
    }

    // Para HLS manifests, usar fetch con buffering
    console.log('TV Proxy: Fetching manifest ->', url);
    const response = await fetchWithRedirects(url);

    const bodyStr = response.body.toString('utf-8');

    // Configurar headers de respuesta
    res.set({
      'Content-Type': 'application/vnd.apple.mpegurl',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Range',
      'Cache-Control': 'no-cache'
    });

    // Si es un manifest M3U8, reescribir las URLs
    if (bodyStr.includes('#EXTM3U') || bodyStr.includes('#EXT-X-')) {
      const baseUrl = response.finalUrl.substring(0, response.finalUrl.lastIndexOf('/') + 1);
      console.log('TV Proxy: Rewriting manifest, baseUrl:', baseUrl);

      const rewrittenData = bodyStr.split('\n').map(line => {
        line = line.trim();

        // Saltar líneas vacías
        if (!line) return line;

        // Reescribir URI en líneas #EXT-X-KEY
        if (line.includes('URI="')) {
          const uriMatch = line.match(/URI="([^"]+)"/);
          if (uriMatch) {
            let keyUrl = uriMatch[1];
            if (!keyUrl.startsWith('http')) {
              keyUrl = baseUrl + keyUrl;
            }
            line = line.replace(uriMatch[0], `URI="/api/tv/stream?url=${encodeURIComponent(keyUrl)}"`);
          }
          return line;
        }

        // Líneas de comentario/metadata
        if (line.startsWith('#')) {
          return line;
        }

        // Es una URL de segmento o sub-playlist
        let segmentUrl = line;
        if (!segmentUrl.startsWith('http')) {
          segmentUrl = baseUrl + segmentUrl;
        }

        return `/api/tv/stream?url=${encodeURIComponent(segmentUrl)}`;
      }).join('\n');

      res.send(rewrittenData);
    } else {
      // Es un segmento de video, enviar como binario
      res.set('Content-Type', response.headers['content-type'] || 'video/mp2t');
      res.send(response.body);
    }

  } catch (error) {
    console.error('TV Proxy error:', error.message);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Error al conectar con el servidor de streaming: ' + error.message });
    }
  }
});

// Endpoint para segmentos binarios grandes (streaming directo)
router.get('/segment', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL requerida' });
  }

  if (!isAllowedHost(url)) {
    return res.status(403).json({ error: 'Host no permitido' });
  }

  try {
    console.log('TV Proxy Segment: Streaming', url);
    await streamWithRedirects(url, res);
  } catch (error) {
    console.error('TV Proxy Segment error:', error.message);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Error al obtener segmento: ' + error.message });
    }
  }
});

// CORS preflight
router.options('/stream', (req, res) => {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Range'
  });
  res.sendStatus(204);
});

router.options('/segment', (req, res) => {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Range'
  });
  res.sendStatus(204);
});

module.exports = router;

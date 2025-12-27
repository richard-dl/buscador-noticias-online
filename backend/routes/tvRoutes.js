const express = require('express');
const router = express.Router();
const http = require('http');
const https = require('https');

/**
 * Proxy para streams de TV
 * Necesario para evitar Mixed Content (HTTPS frontend -> HTTP streaming server)
 */

// Proxy para manifest HLS (.m3u8)
router.get('/stream', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL requerida' });
  }

  try {
    // Validar que la URL sea de un servidor permitido
    const allowedHosts = ['vionixtv.lat', '154.51.248.32'];
    const urlObj = new URL(url);

    if (!allowedHosts.some(host => urlObj.hostname.includes(host))) {
      return res.status(403).json({ error: 'Host no permitido' });
    }

    // Determinar protocolo
    const protocol = urlObj.protocol === 'https:' ? https : http;

    // Hacer request al servidor de streaming
    const proxyReq = protocol.request(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
        'Accept-Language': 'es-ES,es;q=0.9',
      },
      timeout: 30000
    }, (proxyRes) => {
      // Manejar redirects
      if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
        const redirectUrl = proxyRes.headers.location;
        // Recursivamente seguir el redirect
        res.redirect(`/api/tv/stream?url=${encodeURIComponent(redirectUrl)}`);
        return;
      }

      // Configurar headers de respuesta
      res.set({
        'Content-Type': proxyRes.headers['content-type'] || 'application/vnd.apple.mpegurl',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Range',
        'Cache-Control': 'no-cache'
      });

      // Transmitir contenido del manifest, reescribiendo URLs internas
      let data = '';
      proxyRes.on('data', (chunk) => {
        data += chunk.toString();
      });

      proxyRes.on('end', () => {
        // Si es un manifest M3U8, reescribir las URLs relativas para pasar por el proxy
        if (data.includes('#EXTM3U') || data.includes('#EXT-X-')) {
          const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);

          // Reescribir URLs relativas a absolutas pasando por el proxy
          const rewrittenData = data.split('\n').map(line => {
            line = line.trim();

            // Saltar líneas vacías y comentarios
            if (!line || line.startsWith('#')) {
              // Reescribir URI en líneas #EXT-X-KEY si existen
              if (line.includes('URI="')) {
                const uriMatch = line.match(/URI="([^"]+)"/);
                if (uriMatch) {
                  let keyUrl = uriMatch[1];
                  if (!keyUrl.startsWith('http')) {
                    keyUrl = baseUrl + keyUrl;
                  }
                  line = line.replace(uriMatch[0], `URI="/api/tv/stream?url=${encodeURIComponent(keyUrl)}"`);
                }
              }
              return line;
            }

            // Es una URL de segmento
            let segmentUrl = line;
            if (!segmentUrl.startsWith('http')) {
              segmentUrl = baseUrl + segmentUrl;
            }

            return `/api/tv/stream?url=${encodeURIComponent(segmentUrl)}`;
          }).join('\n');

          res.send(rewrittenData);
        } else {
          // No es un manifest, enviar datos binarios directamente
          res.send(data);
        }
      });
    });

    proxyReq.on('error', (error) => {
      console.error('Proxy error:', error.message);
      res.status(502).json({ error: 'Error al conectar con el servidor de streaming' });
    });

    proxyReq.on('timeout', () => {
      proxyReq.destroy();
      res.status(504).json({ error: 'Timeout al conectar con el servidor de streaming' });
    });

    proxyReq.end();

  } catch (error) {
    console.error('Stream proxy error:', error);
    res.status(500).json({ error: 'Error interno del proxy' });
  }
});

// Proxy para segmentos de video (.ts) - streaming binario
router.get('/segment', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL requerida' });
  }

  try {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;

    const proxyReq = protocol.request(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
      },
      timeout: 30000
    }, (proxyRes) => {
      // Manejar redirects
      if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
        const redirectUrl = proxyRes.headers.location;
        res.redirect(`/api/tv/segment?url=${encodeURIComponent(redirectUrl)}`);
        return;
      }

      res.set({
        'Content-Type': proxyRes.headers['content-type'] || 'video/mp2t',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache'
      });

      // Stream binario directamente
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (error) => {
      console.error('Segment proxy error:', error.message);
      res.status(502).json({ error: 'Error al obtener segmento' });
    });

    proxyReq.on('timeout', () => {
      proxyReq.destroy();
      res.status(504).json({ error: 'Timeout' });
    });

    proxyReq.end();

  } catch (error) {
    console.error('Segment proxy error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;

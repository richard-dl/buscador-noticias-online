/**
 * Cloud Functions para Buscador de Noticias Online
 * Este archivo expone la API de Express como una Cloud Function
 */

const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// Inicializar Firebase Admin
admin.initializeApp();

const app = express();

// Configurar CORS
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://buscador.tuplay.top'
  ],
  credentials: true
}));

app.use(express.json());

// ============ Servicios ============

const db = admin.firestore();
const auth = admin.auth();

// RSS Parser
const Parser = require('rss-parser');
const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
});

// Axios para requests HTTP
const axios = require('axios');
const cheerio = require('cheerio');

// ============ Datos estáticos ============

const RSS_FEEDS = {
  nacionales: [
    { name: 'Clarín', url: 'https://www.clarin.com/rss/lo-ultimo/', category: 'general' },
    { name: 'La Nación', url: 'https://www.lanacion.com.ar/arc/outboundfeeds/rss/', category: 'general' },
    { name: 'Infobae', url: 'https://www.infobae.com/feeds/rss/', category: 'general' },
    { name: 'Página 12', url: 'https://www.pagina12.com.ar/rss/portada', category: 'general' },
    { name: 'Perfil', url: 'https://www.perfil.com/feed', category: 'general' }
  ],
  deportes: [
    { name: 'TyC Sports', url: 'https://www.tycsports.com/rss/', category: 'deportes' },
    { name: 'Olé', url: 'https://www.ole.com.ar/rss/', category: 'deportes' }
  ],
  politica: [
    { name: 'Clarín Política', url: 'https://www.clarin.com/rss/politica/', category: 'politica' }
  ],
  economia: [
    { name: 'Ámbito', url: 'https://www.ambito.com/rss/pages/home.xml', category: 'economia' }
  ]
};

const PROVINCIAS = [
  { id: 'buenos-aires', name: 'Buenos Aires' },
  { id: 'caba', name: 'Ciudad Autónoma de Buenos Aires' },
  { id: 'cordoba', name: 'Córdoba' },
  { id: 'santa-fe', name: 'Santa Fe' },
  { id: 'mendoza', name: 'Mendoza' },
  { id: 'tucuman', name: 'Tucumán' },
  { id: 'salta', name: 'Salta' },
  { id: 'entre-rios', name: 'Entre Ríos' },
  { id: 'misiones', name: 'Misiones' },
  { id: 'chaco', name: 'Chaco' },
  { id: 'corrientes', name: 'Corrientes' },
  { id: 'santiago-del-estero', name: 'Santiago del Estero' },
  { id: 'san-juan', name: 'San Juan' },
  { id: 'jujuy', name: 'Jujuy' },
  { id: 'rio-negro', name: 'Río Negro' },
  { id: 'neuquen', name: 'Neuquén' },
  { id: 'formosa', name: 'Formosa' },
  { id: 'chubut', name: 'Chubut' },
  { id: 'san-luis', name: 'San Luis' },
  { id: 'catamarca', name: 'Catamarca' },
  { id: 'la-rioja', name: 'La Rioja' },
  { id: 'la-pampa', name: 'La Pampa' },
  { id: 'santa-cruz', name: 'Santa Cruz' },
  { id: 'tierra-del-fuego', name: 'Tierra del Fuego' }
];

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
  { id: 'internacionales', name: 'Internacionales', icon: '🌐' }
];

// ============ Middleware de Autenticación ============

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Token requerido' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);

    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    req.user = { uid: decodedToken.uid, email: decodedToken.email, ...userDoc.data() };
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Token inválido' });
  }
};

const requireActiveSubscription = async (req, res, next) => {
  const user = req.user;
  const now = new Date();
  const expiresAt = user.expiresAt?.toDate?.() || user.expiresAt;

  if (expiresAt && now > new Date(expiresAt)) {
    return res.status(403).json({
      success: false,
      error: 'Suscripción expirada',
      code: 'SUBSCRIPTION_EXPIRED'
    });
  }

  next();
};

// ============ Funciones Helper ============

const cleanHtml = (text) => {
  if (!text) return '';
  return text.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
};

const extractImage = (item) => {
  if (item.enclosure?.url) return item.enclosure.url;
  const content = item.content || item['content:encoded'] || item.description || '';
  const match = content.match(/<img[^>]+src="([^">]+)"/i);
  return match ? match[1] : null;
};

const generateEmojis = (text, category) => {
  const emojiMap = {
    politica: ['🏛️', '⚖️'],
    economia: ['💰', '📈'],
    deportes: ['⚽', '🏆'],
    espectaculos: ['🎬', '⭐'],
    tecnologia: ['💻', '🤖'],
    policiales: ['🚔', '⚠️'],
    salud: ['🏥', '💊'],
    general: ['📰', '🗞️']
  };
  return emojiMap[category] || emojiMap.general;
};

const summarize = (text, maxLength = 200) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

const shortenUrl = async (url) => {
  try {
    const response = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`, { timeout: 5000 });
    return response.data;
  } catch {
    return url;
  }
};

const parseFeed = async (feedInfo) => {
  try {
    const feed = await parser.parseURL(feedInfo.url);
    return feed.items.slice(0, 10).map(item => ({
      title: cleanHtml(item.title),
      description: cleanHtml(item.contentSnippet || item.description),
      link: item.link,
      pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
      image: extractImage(item),
      source: feedInfo.name,
      category: feedInfo.category
    }));
  } catch (error) {
    console.error(`Error parsing ${feedInfo.name}:`, error.message);
    return [];
  }
};

// ============ Rutas AUTH ============

app.post('/api/auth/register', async (req, res) => {
  try {
    const { uid, email, displayName, authProvider } = req.body;

    if (!uid || !email) {
      return res.status(400).json({ success: false, error: 'UID y email requeridos' });
    }

    const existingUser = await db.collection('users').doc(uid).get();
    if (existingUser.exists) {
      return res.status(409).json({ success: false, error: 'Usuario ya existe' });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await db.collection('users').doc(uid).set({
      uid, email,
      displayName: displayName || '',
      authProvider: authProvider || 'email',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      status: 'trial',
      lastLogin: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(201).json({ success: true, message: 'Usuario registrado', data: { uid, email, status: 'trial', trialDays: 30 } });
  } catch (error) {
    console.error('Error registro:', error);
    res.status(500).json({ success: false, error: 'Error al registrar' });
  }
});

app.post('/api/auth/login', authenticate, async (req, res) => {
  try {
    const user = req.user;
    const now = new Date();
    const expiresAt = user.expiresAt?.toDate?.() || new Date(user.expiresAt);
    const daysRemaining = Math.max(0, Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)));

    await db.collection('users').doc(user.uid).update({
      lastLogin: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({
      success: true,
      data: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        status: user.status,
        expiresAt: expiresAt.toISOString(),
        daysRemaining,
        isExpired: user.status === 'expired' || now > expiresAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error en login' });
  }
});

// ============ Rutas USER ============

app.get('/api/user/profile', authenticate, async (req, res) => {
  const user = req.user;
  const expiresAt = user.expiresAt?.toDate?.() || new Date(user.expiresAt);
  const now = new Date();
  const daysRemaining = Math.max(0, Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)));

  res.json({
    success: true,
    data: {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      subscription: {
        status: user.status,
        expiresAt: expiresAt.toISOString(),
        daysRemaining,
        isValid: now < expiresAt
      }
    }
  });
});

app.get('/api/user/search-profiles', authenticate, async (req, res) => {
  try {
    const snapshot = await db.collection('users').doc(req.user.uid).collection('searchProfiles').orderBy('createdAt', 'desc').get();
    const profiles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, data: profiles });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error obteniendo perfiles' });
  }
});

app.post('/api/user/search-profiles', authenticate, async (req, res) => {
  try {
    const { name, tematicas, provincia, distrito, localidad, keywords, excludeTerms } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, error: 'Nombre requerido' });
    }

    const profileRef = db.collection('users').doc(req.user.uid).collection('searchProfiles').doc();
    const profile = {
      name: name.trim(),
      tematicas: tematicas || [],
      provincia: provincia || null,
      distrito: distrito || null,
      localidad: localidad || null,
      keywords: keywords || [],
      excludeTerms: excludeTerms || [],
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await profileRef.set(profile);
    res.status(201).json({ success: true, data: { id: profileRef.id, ...profile } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error creando perfil' });
  }
});

app.delete('/api/user/search-profiles/:id', authenticate, async (req, res) => {
  try {
    await db.collection('users').doc(req.user.uid).collection('searchProfiles').doc(req.params.id).delete();
    res.json({ success: true, message: 'Perfil eliminado' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error eliminando perfil' });
  }
});

// ============ Rutas NEWS ============

app.get('/api/news/rss', authenticate, requireActiveSubscription, async (req, res) => {
  try {
    const { categories = 'nacionales', maxItems = 10 } = req.query;
    const categoryList = categories.split(',');

    let allFeeds = [];
    for (const cat of categoryList) {
      if (RSS_FEEDS[cat]) {
        allFeeds = allFeeds.concat(RSS_FEEDS[cat]);
      }
    }
    if (allFeeds.length === 0) allFeeds = RSS_FEEDS.nacionales;

    const results = await Promise.allSettled(allFeeds.map(f => parseFeed(f)));
    let allNews = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allNews = allNews.concat(result.value);
      }
    }

    allNews.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    allNews = allNews.slice(0, parseInt(maxItems));

    // Procesar noticias
    for (const news of allNews) {
      news.summary = summarize(news.description);
      news.emojis = generateEmojis(news.title, news.category);
      news.shortUrl = await shortenUrl(news.link);
      news.formattedText = `📰 ${news.title}\n\n📄 ${news.summary}\n\n🎯 ${news.emojis.join(' ')}\n\n🔗 ${news.shortUrl}\n\n📺 Fuente: ${news.source}`;
    }

    res.json({ success: true, count: allNews.length, data: allNews });
  } catch (error) {
    console.error('Error RSS:', error);
    res.status(500).json({ success: false, error: 'Error obteniendo noticias' });
  }
});

app.get('/api/news/search', authenticate, requireActiveSubscription, async (req, res) => {
  try {
    const { tematicas, provincia, localidad, keywords, maxItems = 10 } = req.query;

    // Construir query para Google News
    let queryParts = [];
    if (keywords) queryParts.push(keywords);
    if (tematicas) queryParts.push(tematicas.split(',')[0]);
    if (localidad) queryParts.push(localidad);
    if (provincia) queryParts.push(provincia);
    queryParts.push('Argentina');

    const query = encodeURIComponent(queryParts.join(' '));
    const googleNewsUrl = `https://news.google.com/rss/search?q=${query}&hl=es&gl=AR&ceid=AR:es`;

    let news = [];
    try {
      const feed = await parser.parseURL(googleNewsUrl);
      news = feed.items.slice(0, parseInt(maxItems)).map(item => {
        const title = item.title || '';
        const sourceSeparator = title.lastIndexOf(' - ');
        return {
          title: sourceSeparator > 0 ? title.substring(0, sourceSeparator) : title,
          description: cleanHtml(item.contentSnippet || ''),
          link: item.link,
          pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
          source: sourceSeparator > 0 ? title.substring(sourceSeparator + 3) : 'Google News',
          category: tematicas?.split(',')[0] || 'general'
        };
      });
    } catch (err) {
      console.error('Error Google News:', err.message);
    }

    // Procesar noticias
    for (const n of news) {
      n.summary = summarize(n.description);
      n.emojis = generateEmojis(n.title, n.category);
      n.shortUrl = await shortenUrl(n.link);
      n.formattedText = `📰 ${n.title}\n\n📄 ${n.summary}\n\n🎯 ${n.emojis.join(' ')}\n\n🔗 ${n.shortUrl}\n\n📺 Fuente: ${n.source}`;
    }

    res.json({ success: true, count: news.length, data: news });
  } catch (error) {
    console.error('Error search:', error);
    res.status(500).json({ success: false, error: 'Error buscando noticias' });
  }
});

// ============ Rutas GEO ============

app.get('/api/geo/provincias', (req, res) => {
  res.json({ success: true, data: PROVINCIAS });
});

app.get('/api/geo/tematicas', (req, res) => {
  res.json({ success: true, data: TEMATICAS });
});

app.get('/api/geo/all', (req, res) => {
  res.json({ success: true, data: { provincias: PROVINCIAS, tematicas: TEMATICAS, distritos: {} } });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Buscador de Noticias API funcionando' });
});

// Exportar como Cloud Function
exports.api = functions.https.onRequest(app);

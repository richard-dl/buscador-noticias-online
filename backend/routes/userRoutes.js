const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const {
  getUserFromFirestore,
  checkSubscriptionStatus,
  getSearchProfiles,
  createSearchProfile,
  updateSearchProfile,
  deleteSearchProfile,
  getSavedNews,
  saveNews,
  deleteSavedNews,
  getTvPreferences,
  saveTvPreferences,
  db
} = require('../services/firebaseService');

/**
 * GET /api/user/profile
 * Obtener perfil del usuario autenticado
 */
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await getUserFromFirestore(req.user.uid);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const subscription = await checkSubscriptionStatus(req.user.uid);

    res.json({
      success: true,
      data: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        authProvider: user.authProvider,
        createdAt: user.createdAt?.toDate?.()?.toISOString(),
        subscription: {
          status: user.status,
          expiresAt: subscription.expiresAt?.toISOString(),
          daysRemaining: subscription.daysRemaining,
          isValid: subscription.valid
        },
        searchProfilesCount: user.searchProfilesCount || 0
      }
    });
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener perfil'
    });
  }
});

/**
 * PUT /api/user/profile
 * Actualizar perfil del usuario
 */
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { displayName } = req.body;

    const updateData = {};
    if (displayName !== undefined) {
      updateData.displayName = displayName;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No hay datos para actualizar'
      });
    }

    await db.collection('users').doc(req.user.uid).update(updateData);

    res.json({
      success: true,
      message: 'Perfil actualizado correctamente'
    });
  } catch (error) {
    console.error('Error actualizando perfil:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar perfil'
    });
  }
});

/**
 * GET /api/user/search-profiles
 * Obtener perfiles de búsqueda del usuario
 */
router.get('/search-profiles', authenticate, async (req, res) => {
  try {
    const profiles = await getSearchProfiles(req.user.uid);

    res.json({
      success: true,
      data: profiles
    });
  } catch (error) {
    console.error('Error obteniendo perfiles:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener perfiles de búsqueda'
    });
  }
});

/**
 * POST /api/user/search-profiles
 * Crear nuevo perfil de búsqueda
 */
router.post('/search-profiles', authenticate, async (req, res) => {
  try {
    const {
      name,
      tematicas,
      provincia,
      distrito,
      localidad,
      keywords,
      excludeTerms,
      preferredSources,
      isDefault
    } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'El nombre del perfil es requerido'
      });
    }

    // Limitar cantidad de perfiles por usuario (ej: 10)
    const existingProfiles = await getSearchProfiles(req.user.uid);
    if (existingProfiles.length >= 10) {
      return res.status(400).json({
        success: false,
        error: 'Has alcanzado el límite de 10 perfiles de búsqueda'
      });
    }

    // Si este perfil es default, quitar default de los demás
    if (isDefault) {
      for (const profile of existingProfiles) {
        if (profile.isDefault) {
          await updateSearchProfile(req.user.uid, profile.id, { isDefault: false });
        }
      }
    }

    const profile = await createSearchProfile(req.user.uid, {
      name: name.trim(),
      tematicas: tematicas || [],
      provincia: provincia || null,
      distrito: distrito || null,
      localidad: localidad || null,
      keywords: keywords || [],
      excludeTerms: excludeTerms || [],
      preferredSources: preferredSources || [],
      isDefault: isDefault || false
    });

    res.status(201).json({
      success: true,
      message: 'Perfil creado correctamente',
      data: profile
    });
  } catch (error) {
    console.error('Error creando perfil:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear perfil de búsqueda'
    });
  }
});

/**
 * PUT /api/user/search-profiles/:id
 * Actualizar perfil de búsqueda
 */
router.put('/search-profiles/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      tematicas,
      provincia,
      distrito,
      localidad,
      keywords,
      excludeTerms,
      preferredSources,
      isDefault
    } = req.body;

    const updateData = {};

    if (name !== undefined) updateData.name = name.trim();
    if (tematicas !== undefined) updateData.tematicas = tematicas;
    if (provincia !== undefined) updateData.provincia = provincia;
    if (distrito !== undefined) updateData.distrito = distrito;
    if (localidad !== undefined) updateData.localidad = localidad;
    if (keywords !== undefined) updateData.keywords = keywords;
    if (excludeTerms !== undefined) updateData.excludeTerms = excludeTerms;
    if (preferredSources !== undefined) updateData.preferredSources = preferredSources;
    if (isDefault !== undefined) updateData.isDefault = isDefault;

    // Si este perfil será default, quitar default de los demás
    if (isDefault) {
      const existingProfiles = await getSearchProfiles(req.user.uid);
      for (const profile of existingProfiles) {
        if (profile.isDefault && profile.id !== id) {
          await updateSearchProfile(req.user.uid, profile.id, { isDefault: false });
        }
      }
    }

    const profile = await updateSearchProfile(req.user.uid, id, updateData);

    res.json({
      success: true,
      message: 'Perfil actualizado correctamente',
      data: profile
    });
  } catch (error) {
    console.error('Error actualizando perfil:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar perfil de búsqueda'
    });
  }
});

/**
 * DELETE /api/user/search-profiles/:id
 * Eliminar perfil de búsqueda
 */
router.delete('/search-profiles/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    await deleteSearchProfile(req.user.uid, id);

    res.json({
      success: true,
      message: 'Perfil eliminado correctamente'
    });
  } catch (error) {
    console.error('Error eliminando perfil:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar perfil de búsqueda'
    });
  }
});

// ============ SAVED NEWS ============

/**
 * GET /api/user/saved-news
 * Obtener noticias guardadas del usuario
 */
router.get('/saved-news', authenticate, async (req, res) => {
  try {
    const savedNews = await getSavedNews(req.user.uid);

    res.json({
      success: true,
      data: savedNews
    });
  } catch (error) {
    console.error('Error obteniendo noticias guardadas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener noticias guardadas'
    });
  }
});

/**
 * POST /api/user/saved-news
 * Guardar una noticia
 */
router.post('/saved-news', authenticate, async (req, res) => {
  try {
    const {
      title,
      link,
      description,
      summary,
      image,
      source,
      category,
      pubDate,
      emojis,
      formattedText,
      shortUrl
    } = req.body;

    if (!title || !link) {
      return res.status(400).json({
        success: false,
        error: 'El título y link de la noticia son requeridos'
      });
    }

    const savedNews = await saveNews(req.user.uid, {
      title,
      link,
      description: description || '',
      summary: summary || '',
      image: image || '',
      source: source || '',
      category: category || '',
      pubDate: pubDate || null,
      emojis: emojis || [],
      formattedText: formattedText || '',
      shortUrl: shortUrl || ''
    });

    res.status(201).json({
      success: true,
      message: 'Noticia guardada correctamente',
      data: savedNews
    });
  } catch (error) {
    console.error('Error guardando noticia:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Error al guardar noticia'
    });
  }
});

/**
 * DELETE /api/user/saved-news/:id
 * Eliminar noticia guardada
 */
router.delete('/saved-news/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    await deleteSavedNews(req.user.uid, id);

    res.json({
      success: true,
      message: 'Noticia eliminada correctamente'
    });
  } catch (error) {
    console.error('Error eliminando noticia:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar noticia guardada'
    });
  }
});

// ============ TV PREFERENCES ============

/**
 * GET /api/user/tv-preferences
 * Obtener preferencias de canales de TV favoritos
 */
router.get('/tv-preferences', authenticate, async (req, res) => {
  try {
    const preferences = await getTvPreferences(req.user.uid);

    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    console.error('Error obteniendo preferencias de TV:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener preferencias de TV'
    });
  }
});

/**
 * PUT /api/user/tv-preferences
 * Guardar preferencias de canales de TV favoritos
 * Body: { channel1: { id, category }, channel2: { id, category } }
 */
router.put('/tv-preferences', authenticate, async (req, res) => {
  try {
    const { channel1, channel2 } = req.body;

    // Validar que al menos un canal sea proporcionado
    if (!channel1 && !channel2) {
      return res.status(400).json({
        success: false,
        error: 'Debe proporcionar al menos un canal favorito'
      });
    }

    // Validar estructura de los canales
    const validateChannel = (ch) => {
      if (!ch) return true; // null es válido
      return ch.id && typeof ch.id === 'string';
    };

    if (!validateChannel(channel1) || !validateChannel(channel2)) {
      return res.status(400).json({
        success: false,
        error: 'Formato de canal inválido. Debe incluir al menos { id: string }'
      });
    }

    const preferences = await saveTvPreferences(req.user.uid, {
      channel1: channel1 || null,
      channel2: channel2 || null
    });

    res.json({
      success: true,
      message: 'Preferencias de TV guardadas correctamente',
      data: preferences
    });
  } catch (error) {
    console.error('Error guardando preferencias de TV:', error);
    res.status(500).json({
      success: false,
      error: 'Error al guardar preferencias de TV'
    });
  }
});

module.exports = router;

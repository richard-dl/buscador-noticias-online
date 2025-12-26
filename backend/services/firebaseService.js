const admin = require('firebase-admin');

// Inicializar Firebase Admin SDK
const initializeFirebase = () => {
  try {
    // Si ya está inicializado, devolver la instancia existente
    if (admin.apps.length > 0) {
      return admin.app();
    }

    // Configurar credenciales desde variables de entorno
    const serviceAccount = {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    console.log('✅ Firebase Admin SDK inicializado correctamente');
    return admin.app();
  } catch (error) {
    console.error('❌ Error inicializando Firebase:', error.message);
    throw error;
  }
};

// Inicializar al cargar el módulo
initializeFirebase();

// Obtener instancia de Firestore
const db = admin.firestore();

// Obtener instancia de Auth
const auth = admin.auth();

/**
 * Roles de usuario:
 * - 'trial': usuario en período de prueba (30 días gratis, sin IA)
 * - 'suscriptor': suscripción vitalicia pagada ($39 USD, sin IA)
 * - 'vip_trial': suscriptor probando zona VIP (30 días gratis con IA)
 * - 'vip': suscriptor VIP anual pagado ($90 USD/año, con IA)
 * - 'admin': administrador (acceso total)
 *
 * Flujo de roles:
 * trial (30 días) → suscriptor ($39) → vip_trial (30 días) → vip ($90/año)
 *                                                              ↓ (no renueva)
 *                                                          suscriptor
 */

/**
 * Constantes de suscripción
 */
const SUBSCRIPTION_CONFIG = {
  TRIAL_DAYS: 30,
  VIP_TRIAL_DAYS: 30,
  VIP_ANNUAL_DAYS: 365,
  PRICES: {
    SUSCRIPTOR: 39,  // USD, pago único vitalicio
    VIP_ANNUAL: 90   // USD, pago anual
  }
};

/**
 * Crear usuario en Firestore con suscripción trial de 30 días
 */
const createUserInFirestore = async (uid, userData) => {
  const now = new Date();
  const trialExpiresAt = new Date(now.getTime() + SUBSCRIPTION_CONFIG.TRIAL_DAYS * 24 * 60 * 60 * 1000);

  const userDoc = {
    uid,
    email: userData.email,
    displayName: userData.displayName || '',
    authProvider: userData.authProvider || 'email',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastLogin: admin.firestore.FieldValue.serverTimestamp(),
    searchProfilesCount: 0,

    // Sistema de roles y suscripciones
    role: 'trial', // trial, suscriptor, vip_trial, vip, admin

    // Fechas de expiración por tipo
    trialExpiresAt: admin.firestore.Timestamp.fromDate(trialExpiresAt),
    vipTrialExpiresAt: null,  // Se activa cuando pasa a vip_trial
    vipExpiresAt: null,       // Se activa cuando paga VIP anual

    // Historial de pagos
    subscriptionPaidAt: null, // Fecha de pago vitalicio ($39)
    vipPaidAt: null,          // Fecha de último pago VIP ($90)

    // Campo legacy para compatibilidad (se eliminará después)
    expiresAt: admin.firestore.Timestamp.fromDate(trialExpiresAt),
    status: 'trial'
  };

  await db.collection('users').doc(uid).set(userDoc);
  return userDoc;
};

/**
 * Obtener usuario de Firestore
 */
const getUserFromFirestore = async (uid) => {
  const doc = await db.collection('users').doc(uid).get();
  if (!doc.exists) {
    return null;
  }
  return { id: doc.id, ...doc.data() };
};

/**
 * Actualizar último login y verificar suscripción
 */
const updateLastLogin = async (uid) => {
  const userRef = db.collection('users').doc(uid);
  const user = await userRef.get();

  if (!user.exists) {
    return null;
  }

  const userData = user.data();
  const now = new Date();
  const expiresAt = userData.expiresAt?.toDate();

  // Verificar si la suscripción expiró
  let newStatus = userData.status;
  if (expiresAt && now > expiresAt && userData.status !== 'expired') {
    newStatus = 'expired';
  }

  await userRef.update({
    lastLogin: admin.firestore.FieldValue.serverTimestamp(),
    status: newStatus
  });

  return {
    ...userData,
    status: newStatus,
    expiresAt: expiresAt
  };
};

/**
 * Verificar estado de suscripción
 */
const checkSubscriptionStatus = async (uid) => {
  const user = await getUserFromFirestore(uid);
  if (!user) {
    return { valid: false, reason: 'Usuario no encontrado' };
  }

  const now = new Date();
  const expiresAt = user.expiresAt?.toDate();

  if (!expiresAt) {
    return { valid: false, reason: 'Sin fecha de expiración' };
  }

  if (now > expiresAt) {
    // Actualizar estado a expirado si no lo está
    if (user.status !== 'expired') {
      await db.collection('users').doc(uid).update({ status: 'expired' });
    }
    return {
      valid: false,
      reason: 'Suscripción expirada',
      expiredAt: expiresAt
    };
  }

  const daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

  return {
    valid: true,
    status: user.status,
    expiresAt: expiresAt,
    daysRemaining: daysRemaining
  };
};

/**
 * Obtener perfiles de búsqueda del usuario
 */
const getSearchProfiles = async (uid) => {
  const snapshot = await db
    .collection('users')
    .doc(uid)
    .collection('searchProfiles')
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

/**
 * Crear perfil de búsqueda
 */
const createSearchProfile = async (uid, profileData) => {
  const profileRef = db
    .collection('users')
    .doc(uid)
    .collection('searchProfiles')
    .doc();

  const profile = {
    ...profileData,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await profileRef.set(profile);

  // Incrementar contador de perfiles
  await db.collection('users').doc(uid).update({
    searchProfilesCount: admin.firestore.FieldValue.increment(1)
  });

  return { id: profileRef.id, ...profile };
};

/**
 * Actualizar perfil de búsqueda
 */
const updateSearchProfile = async (uid, profileId, profileData) => {
  const profileRef = db
    .collection('users')
    .doc(uid)
    .collection('searchProfiles')
    .doc(profileId);

  await profileRef.update({
    ...profileData,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  const updated = await profileRef.get();
  return { id: updated.id, ...updated.data() };
};

/**
 * Eliminar perfil de búsqueda
 */
const deleteSearchProfile = async (uid, profileId) => {
  await db
    .collection('users')
    .doc(uid)
    .collection('searchProfiles')
    .doc(profileId)
    .delete();

  // Decrementar contador de perfiles
  await db.collection('users').doc(uid).update({
    searchProfilesCount: admin.firestore.FieldValue.increment(-1)
  });

  return true;
};

/**
 * Guardar búsqueda en historial
 */
const saveSearchHistory = async (uid, searchData) => {
  await db.collection('searchHistory').add({
    userId: uid,
    query: searchData.query,
    filters: searchData.filters,
    resultsCount: searchData.resultsCount,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });
};

/**
 * Obtener noticias guardadas del usuario
 */
const getSavedNews = async (uid) => {
  const snapshot = await db
    .collection('users')
    .doc(uid)
    .collection('savedNews')
    .orderBy('savedAt', 'desc')
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

/**
 * Guardar noticia
 */
const saveNews = async (uid, newsData) => {
  // Verificar si ya existe por link
  const existing = await db
    .collection('users')
    .doc(uid)
    .collection('savedNews')
    .where('link', '==', newsData.link)
    .get();

  if (!existing.empty) {
    throw new Error('Esta noticia ya está guardada');
  }

  // Limitar a 100 noticias guardadas
  const allSaved = await getSavedNews(uid);
  if (allSaved.length >= 100) {
    throw new Error('Has alcanzado el límite de 100 noticias guardadas');
  }

  const newsRef = db
    .collection('users')
    .doc(uid)
    .collection('savedNews')
    .doc();

  const news = {
    ...newsData,
    savedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await newsRef.set(news);
  return { id: newsRef.id, ...news };
};

/**
 * Eliminar noticia guardada
 */
const deleteSavedNews = async (uid, newsId) => {
  await db
    .collection('users')
    .doc(uid)
    .collection('savedNews')
    .doc(newsId)
    .delete();

  return true;
};

/**
 * Verificar token de Firebase
 */
const verifyIdToken = async (idToken) => {
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    throw new Error('Token inválido o expirado');
  }
};

/**
 * Actualizar rol de usuario (uso interno/admin)
 */
const updateUserRole = async (uid, newRole, options = {}) => {
  const validRoles = ['trial', 'suscriptor', 'vip_trial', 'vip', 'admin'];
  if (!validRoles.includes(newRole)) {
    throw new Error('Rol inválido');
  }

  const updateData = { role: newRole };
  const now = new Date();

  // Configurar fechas según el rol
  if (newRole === 'vip' && options.vipExpiresAt) {
    updateData.vipExpiresAt = admin.firestore.Timestamp.fromDate(new Date(options.vipExpiresAt));
  }

  if (newRole === 'vip_trial' && options.vipTrialExpiresAt) {
    updateData.vipTrialExpiresAt = admin.firestore.Timestamp.fromDate(new Date(options.vipTrialExpiresAt));
  }

  await db.collection('users').doc(uid).update(updateData);
  return getUserFromFirestore(uid);
};

/**
 * Activar suscripción vitalicia ($39 USD)
 * Transición: trial → suscriptor
 */
const activateSuscriptor = async (uid, paymentData = {}) => {
  const user = await getUserFromFirestore(uid);
  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  // Solo trial puede activar suscriptor
  if (user.role !== 'trial' && user.role !== 'admin') {
    throw new Error('Solo usuarios en trial pueden activar suscripción');
  }

  const now = new Date();
  const updateData = {
    role: 'suscriptor',
    subscriptionPaidAt: admin.firestore.Timestamp.fromDate(now),
    status: 'active', // Campo legacy
    // Guardar referencia de pago si existe
    ...(paymentData.paymentId && { lastPaymentId: paymentData.paymentId }),
    ...(paymentData.paymentMethod && { paymentMethod: paymentData.paymentMethod })
  };

  await db.collection('users').doc(uid).update(updateData);
  return getUserFromFirestore(uid);
};

/**
 * Activar período de prueba VIP (30 días gratis)
 * Transición: suscriptor → vip_trial
 */
const activateVipTrial = async (uid) => {
  const user = await getUserFromFirestore(uid);
  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  // Solo suscriptor puede activar VIP trial
  if (user.role !== 'suscriptor') {
    throw new Error('Solo suscriptores pueden activar prueba VIP');
  }

  // Verificar que no haya usado VIP trial antes
  if (user.vipTrialExpiresAt) {
    throw new Error('Ya utilizaste tu período de prueba VIP');
  }

  const now = new Date();
  const vipTrialExpiresAt = new Date(now.getTime() + SUBSCRIPTION_CONFIG.VIP_TRIAL_DAYS * 24 * 60 * 60 * 1000);

  const updateData = {
    role: 'vip_trial',
    vipTrialExpiresAt: admin.firestore.Timestamp.fromDate(vipTrialExpiresAt)
  };

  await db.collection('users').doc(uid).update(updateData);
  return getUserFromFirestore(uid);
};

/**
 * Activar suscripción VIP anual ($90 USD)
 * Transición: vip_trial → vip (o renovación vip → vip)
 */
const activateVipAnnual = async (uid, paymentData = {}) => {
  const user = await getUserFromFirestore(uid);
  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  // Solo vip_trial, vip (renovación) o suscriptor pueden activar VIP anual
  const allowedRoles = ['vip_trial', 'vip', 'suscriptor'];
  if (!allowedRoles.includes(user.role) && user.role !== 'admin') {
    throw new Error('No puedes activar VIP anual desde tu rol actual');
  }

  const now = new Date();
  let vipExpiresAt;

  // Si ya es VIP y está renovando, extender desde la fecha actual de expiración
  if (user.role === 'vip' && user.vipExpiresAt) {
    const currentExpiry = user.vipExpiresAt.toDate();
    // Si aún no expiró, extender desde esa fecha
    if (currentExpiry > now) {
      vipExpiresAt = new Date(currentExpiry.getTime() + SUBSCRIPTION_CONFIG.VIP_ANNUAL_DAYS * 24 * 60 * 60 * 1000);
    } else {
      vipExpiresAt = new Date(now.getTime() + SUBSCRIPTION_CONFIG.VIP_ANNUAL_DAYS * 24 * 60 * 60 * 1000);
    }
  } else {
    vipExpiresAt = new Date(now.getTime() + SUBSCRIPTION_CONFIG.VIP_ANNUAL_DAYS * 24 * 60 * 60 * 1000);
  }

  const updateData = {
    role: 'vip',
    vipExpiresAt: admin.firestore.Timestamp.fromDate(vipExpiresAt),
    vipPaidAt: admin.firestore.Timestamp.fromDate(now),
    ...(paymentData.paymentId && { lastVipPaymentId: paymentData.paymentId }),
    ...(paymentData.paymentMethod && { vipPaymentMethod: paymentData.paymentMethod })
  };

  await db.collection('users').doc(uid).update(updateData);
  return getUserFromFirestore(uid);
};

/**
 * Verificar si el usuario tiene acceso VIP (IA)
 */
const checkVipAccess = async (uid) => {
  const user = await getUserFromFirestore(uid);
  if (!user) {
    return { hasAccess: false, reason: 'Usuario no encontrado' };
  }

  // Admin siempre tiene acceso
  if (user.role === 'admin') {
    return { hasAccess: true, isAdmin: true };
  }

  const now = new Date();

  // VIP Trial - verificar expiración
  if (user.role === 'vip_trial') {
    const vipTrialExpiresAt = user.vipTrialExpiresAt?.toDate();

    if (vipTrialExpiresAt && now > vipTrialExpiresAt) {
      // Degradar a suscriptor si expiró VIP trial
      await db.collection('users').doc(uid).update({ role: 'suscriptor' });
      return { hasAccess: false, reason: 'Período de prueba VIP expirado', expiredAt: vipTrialExpiresAt };
    }

    const daysRemaining = vipTrialExpiresAt ? Math.ceil((vipTrialExpiresAt - now) / (1000 * 60 * 60 * 24)) : null;

    return {
      hasAccess: true,
      role: user.role,
      isTrial: true,
      expiresAt: vipTrialExpiresAt,
      daysRemaining: daysRemaining
    };
  }

  // VIP Anual - verificar expiración
  if (user.role === 'vip') {
    const vipExpiresAt = user.vipExpiresAt?.toDate();

    if (vipExpiresAt && now > vipExpiresAt) {
      // Degradar a suscriptor si expiró VIP anual
      await db.collection('users').doc(uid).update({ role: 'suscriptor' });
      return { hasAccess: false, reason: 'Suscripción VIP expirada', expiredAt: vipExpiresAt };
    }

    const daysRemaining = vipExpiresAt ? Math.ceil((vipExpiresAt - now) / (1000 * 60 * 60 * 24)) : null;

    return {
      hasAccess: true,
      role: user.role,
      isTrial: false,
      expiresAt: vipExpiresAt,
      daysRemaining: daysRemaining
    };
  }

  // Otros roles no tienen acceso VIP
  return { hasAccess: false, reason: 'Requiere suscripción VIP' };
};

/**
 * Verificar estado completo de suscripción del usuario
 */
const getSubscriptionStatus = async (uid) => {
  const user = await getUserFromFirestore(uid);
  if (!user) {
    return { valid: false, reason: 'Usuario no encontrado' };
  }

  const now = new Date();
  const role = user.role;

  // Admin
  if (role === 'admin') {
    return {
      valid: true,
      role: 'admin',
      hasVipAccess: true,
      isAdmin: true
    };
  }

  // Trial
  if (role === 'trial') {
    const trialExpiresAt = user.trialExpiresAt?.toDate();

    if (trialExpiresAt && now > trialExpiresAt) {
      return {
        valid: false,
        role: 'trial',
        reason: 'Período de prueba expirado',
        expiredAt: trialExpiresAt,
        hasVipAccess: false,
        canUpgradeTo: ['suscriptor']
      };
    }

    const daysRemaining = trialExpiresAt ? Math.ceil((trialExpiresAt - now) / (1000 * 60 * 60 * 24)) : 0;

    return {
      valid: true,
      role: 'trial',
      expiresAt: trialExpiresAt,
      daysRemaining: daysRemaining,
      hasVipAccess: false,
      canUpgradeTo: ['suscriptor']
    };
  }

  // Suscriptor (vitalicio)
  if (role === 'suscriptor') {
    const canActivateVipTrial = !user.vipTrialExpiresAt; // Solo si nunca usó VIP trial

    return {
      valid: true,
      role: 'suscriptor',
      isLifetime: true,
      hasVipAccess: false,
      canActivateVipTrial: canActivateVipTrial,
      canUpgradeTo: canActivateVipTrial ? ['vip_trial', 'vip'] : ['vip']
    };
  }

  // VIP Trial
  if (role === 'vip_trial') {
    const vipTrialExpiresAt = user.vipTrialExpiresAt?.toDate();

    if (vipTrialExpiresAt && now > vipTrialExpiresAt) {
      // Auto-degradar
      await db.collection('users').doc(uid).update({ role: 'suscriptor' });
      return {
        valid: true,
        role: 'suscriptor',
        isLifetime: true,
        hasVipAccess: false,
        vipTrialExpired: true,
        canUpgradeTo: ['vip']
      };
    }

    const daysRemaining = vipTrialExpiresAt ? Math.ceil((vipTrialExpiresAt - now) / (1000 * 60 * 60 * 24)) : 0;

    return {
      valid: true,
      role: 'vip_trial',
      expiresAt: vipTrialExpiresAt,
      daysRemaining: daysRemaining,
      hasVipAccess: true,
      canUpgradeTo: ['vip']
    };
  }

  // VIP Anual
  if (role === 'vip') {
    const vipExpiresAt = user.vipExpiresAt?.toDate();

    if (vipExpiresAt && now > vipExpiresAt) {
      // Auto-degradar
      await db.collection('users').doc(uid).update({ role: 'suscriptor' });
      return {
        valid: true,
        role: 'suscriptor',
        isLifetime: true,
        hasVipAccess: false,
        vipExpired: true,
        canUpgradeTo: ['vip']
      };
    }

    const daysRemaining = vipExpiresAt ? Math.ceil((vipExpiresAt - now) / (1000 * 60 * 60 * 24)) : 0;

    return {
      valid: true,
      role: 'vip',
      expiresAt: vipExpiresAt,
      daysRemaining: daysRemaining,
      hasVipAccess: true,
      canRenew: true
    };
  }

  return { valid: false, reason: 'Rol desconocido' };
};

/**
 * Guardar contenido VIP desde Telegram
 */
const saveVipContent = async (contentData) => {
  const contentRef = db.collection('vipContent').doc();

  const content = {
    titulo: contentData.titulo || '',
    fuente: contentData.fuente || '',
    contenido: contentData.contenido || '',
    sensible: contentData.sensible || [],
    imagen: contentData.imagen || null,
    telegramMessageId: contentData.telegramMessageId || null,
    // Campos de agrupación
    groupId: contentData.groupId || null,
    replyToMessageId: contentData.replyToMessageId || null,
    isReply: contentData.isReply || false,
    telegramUserId: contentData.telegramUserId || null,
    telegramUserName: contentData.telegramUserName || null,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await contentRef.set(content);

  // Limpiar contenido antiguo de forma asíncrona (no bloquea el guardado)
  cleanupOldVipContent().catch(err => {
    console.error('[VIP Cleanup] Error en limpieza automática:', err);
  });

  return { id: contentRef.id, ...content };
};

/**
 * Obtener contenido VIP
 */
const getVipContent = async (limit = 150) => {
  const snapshot = await db
    .collection('vipContent')
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

/**
 * Eliminar contenido VIP
 */
const deleteVipContent = async (contentId) => {
  await db.collection('vipContent').doc(contentId).delete();
  return true;
};

/**
 * Limpiar contenido VIP antiguo que excede el límite
 * Mantiene solo los N elementos más recientes
 */
const VIP_CONTENT_LIMIT = 150;

const cleanupOldVipContent = async () => {
  try {
    // Contar total de documentos
    const countSnapshot = await db.collection('vipContent').count().get();
    const totalCount = countSnapshot.data().count;

    if (totalCount <= VIP_CONTENT_LIMIT) {
      return { deleted: 0, remaining: totalCount };
    }

    const toDelete = totalCount - VIP_CONTENT_LIMIT;
    console.log(`[VIP Cleanup] Total: ${totalCount}, Límite: ${VIP_CONTENT_LIMIT}, A eliminar: ${toDelete}`);

    // Obtener los documentos más antiguos que exceden el límite
    const oldDocsSnapshot = await db
      .collection('vipContent')
      .orderBy('createdAt', 'asc')
      .limit(toDelete)
      .get();

    if (oldDocsSnapshot.empty) {
      return { deleted: 0, remaining: totalCount };
    }

    // Eliminar en batch (máximo 500 por batch en Firestore)
    const batch = db.batch();
    let deletedCount = 0;

    oldDocsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
      deletedCount++;
    });

    await batch.commit();
    console.log(`[VIP Cleanup] Eliminados ${deletedCount} documentos antiguos`);

    return { deleted: deletedCount, remaining: totalCount - deletedCount };
  } catch (error) {
    console.error('[VIP Cleanup] Error limpiando contenido antiguo:', error);
    return { deleted: 0, error: error.message };
  }
};

/**
 * Actualizar contenido VIP (solo admin)
 */
const updateVipContent = async (contentId, updateData) => {
  const docRef = db.collection('vipContent').doc(contentId);
  const doc = await docRef.get();

  if (!doc.exists) {
    throw new Error('Contenido no encontrado');
  }

  // Solo permitir actualizar campos específicos
  const allowedFields = ['titulo', 'fuente', 'contenido'];
  const filteredData = {};

  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      filteredData[field] = updateData[field];
    }
  }

  if (Object.keys(filteredData).length === 0) {
    throw new Error('No hay campos válidos para actualizar');
  }

  filteredData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

  await docRef.update(filteredData);

  const updated = await docRef.get();
  return { id: updated.id, ...updated.data() };
};

/**
 * Obtener contenido VIP por telegramMessageId
 * Útil para encontrar el groupId cuando se responde a un mensaje
 */
const getVipContentByTelegramMessageId = async (telegramMessageId, chatId) => {
  try {
    const snapshot = await db
      .collection('vipContent')
      .where('telegramMessageId', '==', telegramMessageId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error('Error buscando contenido por telegramMessageId:', error);
    return null;
  }
};

/**
 * Buscar el contenido VIP más reciente de un usuario de Telegram dentro de una ventana de tiempo
 * Usado para agrupar mensajes consecutivos del mismo usuario
 */
const getRecentVipContentByTelegramUser = async (telegramUserId, chatId, windowMinutes = 10) => {
  try {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

    const snapshot = await db
      .collection('vipContent')
      .where('telegramUserId', '==', telegramUserId)
      .where('createdAt', '>=', windowStart)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error('Error buscando contenido reciente por telegramUserId:', error);
    return null;
  }
};

/**
 * Obtener todos los usuarios desde Firestore
 */
const getAllUsersFromFirestore = async () => {
  try {
    const usersSnapshot = await db.collection('users').get();
    const users = [];
    const now = new Date();

    // Helper para convertir timestamp de Firestore a Date
    const toDate = (timestamp) => {
      if (!timestamp) return null;
      if (timestamp instanceof Date) return timestamp;
      if (typeof timestamp.toDate === 'function') return timestamp.toDate();
      if (timestamp._seconds) return new Date(timestamp._seconds * 1000);
      return null;
    };

    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      const role = userData.role || 'trial';

      // Calcular días restantes según el rol
      let daysRemaining = null;
      let isExpired = false;
      let expiresAt = null;

      if (role === 'admin' || role === 'suscriptor') {
        // Admin y suscriptor no expiran
        daysRemaining = null;
        isExpired = false;
      } else if (role === 'trial') {
        // Trial usa trialExpiresAt o expiresAt (legacy)
        expiresAt = toDate(userData.trialExpiresAt) || toDate(userData.expiresAt);
        if (expiresAt) {
          daysRemaining = Math.max(0, Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)));
          isExpired = now > expiresAt;
        }
      } else if (role === 'vip_trial') {
        // VIP Trial usa vipTrialExpiresAt
        expiresAt = toDate(userData.vipTrialExpiresAt);
        if (expiresAt) {
          daysRemaining = Math.max(0, Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)));
          isExpired = now > expiresAt;
        }
      } else if (role === 'vip') {
        // VIP anual usa vipExpiresAt
        expiresAt = toDate(userData.vipExpiresAt);
        if (expiresAt) {
          daysRemaining = Math.max(0, Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)));
          isExpired = now > expiresAt;
        }
      }

      // Verificar campo legacy status para compatibilidad
      if (userData.status === 'expired') {
        isExpired = true;
      }

      users.push({
        uid: doc.id,
        email: userData.email,
        displayName: userData.displayName || 'Sin nombre',
        role: role,
        status: userData.status,
        createdAt: userData.createdAt,
        lastLogin: userData.lastLogin,
        authProvider: userData.authProvider,
        expiresAt: expiresAt?.toISOString() || null,
        daysRemaining: daysRemaining,
        isExpired: isExpired
      });
    }

    // Ordenar por fecha de creación (más recientes primero)
    users.sort((a, b) => {
      const dateA = a.createdAt?._seconds || 0;
      const dateB = b.createdAt?._seconds || 0;
      return dateB - dateA;
    });

    return users;
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    throw error;
  }
};

/**
 * Guardar registro de pago en Firestore
 * @param {object} paymentData - Datos del pago
 */
const savePaymentRecord = async (paymentData) => {
  try {
    const paymentDoc = {
      ...paymentData,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('payments').add(paymentDoc);
    console.log(`Registro de pago guardado: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error('Error guardando registro de pago:', error);
    throw error;
  }
};

/**
 * Obtener historial de pagos de un usuario
 * @param {string} userId - ID del usuario
 */
const getPaymentHistory = async (userId) => {
  try {
    const snapshot = await db.collection('payments')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error obteniendo historial de pagos:', error);
    throw error;
  }
};

// ============ SESIONES ============

const SESSION_CONFIG = {
  MAX_SESSIONS_DEFAULT: 3,
  SESSION_DURATION_DAYS: 30,
  MAX_SESSIONS_BY_ROLE: {
    trial: 2,
    suscriptor: 3,
    vip_trial: 3,
    vip: 3,
    admin: 10
  }
};

/**
 * Crear nueva sesión para usuario
 */
const createSession = async (uid, sessionData) => {
  const { deviceId, deviceInfo, ip, ipInfo } = sessionData;

  const user = await getUserFromFirestore(uid);
  if (!user) throw new Error('Usuario no encontrado');

  const maxSessions = user.maxSessions ||
    SESSION_CONFIG.MAX_SESSIONS_BY_ROLE[user.role] ||
    SESSION_CONFIG.MAX_SESSIONS_DEFAULT;

  const singleSessionMode = user.singleSessionMode === true;

  // Obtener sesiones activas actuales
  const activeSessions = await getActiveSessions(uid);

  // Modo sesión única: revocar todas las anteriores
  if (singleSessionMode && activeSessions.length > 0) {
    for (const session of activeSessions) {
      await revokeSession(uid, session.id, 'new_login');
    }
  }
  // Límite de dispositivos: verificar si ya existe sesión del dispositivo o revocar la más antigua
  else if (activeSessions.length >= maxSessions) {
    // Verificar si este dispositivo ya tiene sesión activa
    const existingSession = activeSessions.find(s => s.deviceId === deviceId);

    if (existingSession) {
      // Actualizar sesión existente en lugar de crear nueva
      await updateSessionActivity(uid, existingSession.id, ip);
      return { sessionId: existingSession.id, updated: true };
    }

    // Revocar la sesión más antigua
    const oldestSession = activeSessions.sort(
      (a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0)
    )[0];
    await revokeSession(uid, oldestSession.id, 'max_sessions');
  } else {
    // Verificar si el dispositivo ya tiene sesión (sin exceder límite)
    const existingSession = activeSessions.find(s => s.deviceId === deviceId);
    if (existingSession) {
      await updateSessionActivity(uid, existingSession.id, ip);
      return { sessionId: existingSession.id, updated: true };
    }
  }

  // Crear nueva sesión
  const crypto = require('crypto');
  const sessionId = crypto.randomUUID();

  const now = new Date();
  const expiresAt = new Date(now.getTime() +
    SESSION_CONFIG.SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

  const sessionDoc = {
    sessionId,
    deviceId: deviceId || 'unknown',
    deviceInfo: deviceInfo || {},
    ip: ip || 'unknown',
    ipInfo: ipInfo || {},
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastActivity: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
    isActive: true,
    revokedAt: null,
    revokedReason: null
  };

  await db.collection('users').doc(uid)
    .collection('sessions').doc(sessionId)
    .set(sessionDoc);

  return { sessionId, expiresAt: expiresAt.toISOString() };
};

/**
 * Obtener sesiones activas del usuario
 */
const getActiveSessions = async (uid) => {
  const now = new Date();

  const snapshot = await db.collection('users').doc(uid)
    .collection('sessions')
    .where('isActive', '==', true)
    .get();

  const sessions = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const expiresAt = data.expiresAt?.toDate?.();

    // Verificar si expiró
    if (expiresAt && now > expiresAt) {
      // Marcar como expirada (no await para no bloquear)
      revokeSession(uid, doc.id, 'expired').catch(console.error);
      continue;
    }

    sessions.push({
      id: doc.id,
      ...data
    });
  }

  return sessions;
};

/**
 * Validar sesión activa
 */
const validateSession = async (uid, sessionId) => {
  if (!sessionId) {
    return { valid: false, reason: 'No hay sesión' };
  }

  const sessionRef = db.collection('users').doc(uid)
    .collection('sessions').doc(sessionId);

  const sessionDoc = await sessionRef.get();

  if (!sessionDoc.exists) {
    return { valid: false, reason: 'Sesión no encontrada' };
  }

  const session = sessionDoc.data();

  if (!session.isActive) {
    let reason = 'Sesión revocada';
    if (session.revokedReason === 'new_login') {
      reason = 'Sesión cerrada por nuevo inicio de sesión en otro dispositivo';
    } else if (session.revokedReason === 'max_sessions') {
      reason = 'Sesión cerrada por límite de dispositivos alcanzado';
    } else if (session.revokedReason === 'expired') {
      reason = 'Sesión expirada';
    }
    return { valid: false, reason };
  }

  const now = new Date();
  const expiresAt = session.expiresAt?.toDate?.();

  if (expiresAt && now > expiresAt) {
    await revokeSession(uid, sessionId, 'expired');
    return { valid: false, reason: 'Sesión expirada' };
  }

  // Actualizar última actividad (throttled - máximo cada 5 minutos)
  const lastActivity = session.lastActivity?.toDate?.();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

  if (!lastActivity || lastActivity < fiveMinutesAgo) {
    sessionRef.update({
      lastActivity: admin.firestore.FieldValue.serverTimestamp()
    }).catch(console.error);
  }

  return { valid: true, session };
};

/**
 * Revocar sesión
 */
const revokeSession = async (uid, sessionId, reason = 'manual') => {
  const sessionRef = db.collection('users').doc(uid)
    .collection('sessions').doc(sessionId);

  await sessionRef.update({
    isActive: false,
    revokedAt: admin.firestore.FieldValue.serverTimestamp(),
    revokedReason: reason
  });

  return true;
};

/**
 * Revocar todas las sesiones del usuario
 */
const revokeAllSessions = async (uid, exceptSessionId = null) => {
  const sessions = await getActiveSessions(uid);
  let revokedCount = 0;

  for (const session of sessions) {
    if (session.id !== exceptSessionId) {
      await revokeSession(uid, session.id, 'logout_all');
      revokedCount++;
    }
  }

  return revokedCount;
};

/**
 * Actualizar actividad de sesión
 */
const updateSessionActivity = async (uid, sessionId, ip = null) => {
  const updateData = {
    lastActivity: admin.firestore.FieldValue.serverTimestamp()
  };

  if (ip) {
    updateData.ip = ip;
  }

  await db.collection('users').doc(uid)
    .collection('sessions').doc(sessionId)
    .update(updateData);

  return true;
};

/**
 * Actualizar configuración de sesiones del usuario
 */
const updateSessionSettings = async (uid, settings) => {
  const { singleSessionMode, maxSessions } = settings;

  const updateData = {};

  if (singleSessionMode !== undefined) {
    updateData.singleSessionMode = Boolean(singleSessionMode);
  }

  if (maxSessions !== undefined && maxSessions >= 1 && maxSessions <= 10) {
    updateData.maxSessions = maxSessions;
  }

  if (Object.keys(updateData).length > 0) {
    await db.collection('users').doc(uid).update(updateData);
  }

  return getUserFromFirestore(uid);
};

/**
 * Obtener configuración de sesiones del usuario
 */
const getSessionSettings = async (uid) => {
  const user = await getUserFromFirestore(uid);
  if (!user) throw new Error('Usuario no encontrado');

  return {
    maxSessions: user.maxSessions ||
      SESSION_CONFIG.MAX_SESSIONS_BY_ROLE[user.role] ||
      SESSION_CONFIG.MAX_SESSIONS_DEFAULT,
    singleSessionMode: user.singleSessionMode || false
  };
};

// ==================== FUNCIONES DE ADMIN PARA SESIONES ====================

/**
 * Obtener todos los usuarios con sus sesiones activas (para admin)
 */
const getAllUsersWithSessions = async () => {
  const usersSnapshot = await db.collection('users').get();
  const usersWithSessions = [];

  for (const userDoc of usersSnapshot.docs) {
    const userData = userDoc.data();
    const uid = userDoc.id;

    // Obtener sesiones activas
    const sessionsSnapshot = await db.collection('users').doc(uid)
      .collection('sessions')
      .where('isActive', '==', true)
      .get();

    const sessions = [];
    for (const sessionDoc of sessionsSnapshot.docs) {
      const sessionData = sessionDoc.data();
      sessions.push({
        id: sessionDoc.id,
        ...sessionData,
        createdAt: sessionData.createdAt?.toDate?.()?.toISOString() || null,
        lastActivity: sessionData.lastActivity?.toDate?.()?.toISOString() || null,
        expiresAt: sessionData.expiresAt?.toDate?.()?.toISOString() || null
      });
    }

    usersWithSessions.push({
      uid,
      email: userData.email,
      displayName: userData.displayName || userData.email?.split('@')[0],
      role: userData.role || 'trial',
      singleSessionMode: userData.singleSessionMode || false,
      maxSessions: userData.maxSessions ||
        SESSION_CONFIG.MAX_SESSIONS_BY_ROLE[userData.role] ||
        SESSION_CONFIG.MAX_SESSIONS_DEFAULT,
      activeSessions: sessions.length,
      sessions
    });
  }

  // Ordenar por cantidad de sesiones activas (mayor primero)
  return usersWithSessions.sort((a, b) => b.activeSessions - a.activeSessions);
};

/**
 * Revocar sesión de cualquier usuario (admin)
 */
const adminRevokeSession = async (targetUid, sessionId, reason = 'admin_revoked') => {
  const sessionRef = db.collection('users').doc(targetUid)
    .collection('sessions').doc(sessionId);

  await sessionRef.update({
    isActive: false,
    revokedAt: admin.firestore.FieldValue.serverTimestamp(),
    revokedReason: reason
  });
};

/**
 * Revocar todas las sesiones de un usuario (admin)
 */
const adminRevokeAllUserSessions = async (targetUid) => {
  const sessions = await getActiveSessions(targetUid);
  let count = 0;

  for (const session of sessions) {
    await adminRevokeSession(targetUid, session.id, 'admin_revoked_all');
    count++;
  }

  return count;
};

/**
 * Actualizar configuración de sesiones de un usuario (admin)
 */
const adminUpdateUserSessionSettings = async (targetUid, settings) => {
  const { singleSessionMode, maxSessions } = settings;
  const updateData = {};

  if (singleSessionMode !== undefined) {
    updateData.singleSessionMode = Boolean(singleSessionMode);
  }

  if (maxSessions !== undefined && maxSessions >= 1 && maxSessions <= 10) {
    updateData.maxSessions = maxSessions;
  }

  if (Object.keys(updateData).length > 0) {
    await db.collection('users').doc(targetUid).update(updateData);
  }

  const user = await getUserFromFirestore(targetUid);
  return {
    maxSessions: user.maxSessions ||
      SESSION_CONFIG.MAX_SESSIONS_BY_ROLE[user.role] ||
      SESSION_CONFIG.MAX_SESSIONS_DEFAULT,
    singleSessionMode: user.singleSessionMode || false
  };
};

module.exports = {
  admin,
  db,
  auth,
  createUserInFirestore,
  getUserFromFirestore,
  updateLastLogin,
  checkSubscriptionStatus,
  getSearchProfiles,
  createSearchProfile,
  updateSearchProfile,
  deleteSearchProfile,
  saveSearchHistory,
  getSavedNews,
  saveNews,
  deleteSavedNews,
  verifyIdToken,
  getAllUsersFromFirestore,
  updateUserRole,
  checkVipAccess,
  saveVipContent,
  getVipContent,
  deleteVipContent,
  updateVipContent,
  getVipContentByTelegramMessageId,
  getRecentVipContentByTelegramUser,
  cleanupOldVipContent,
  VIP_CONTENT_LIMIT,
  // Funciones de suscripción
  SUBSCRIPTION_CONFIG,
  activateSuscriptor,
  activateVipTrial,
  activateVipAnnual,
  getSubscriptionStatus,
  // Funciones de pagos
  savePaymentRecord,
  getPaymentHistory,
  // Funciones de sesiones
  SESSION_CONFIG,
  createSession,
  getActiveSessions,
  validateSession,
  revokeSession,
  revokeAllSessions,
  updateSessionActivity,
  updateSessionSettings,
  getSessionSettings,
  // Funciones de admin para sesiones
  getAllUsersWithSessions,
  adminRevokeSession,
  adminRevokeAllUserSessions,
  adminUpdateUserSessionSettings
};

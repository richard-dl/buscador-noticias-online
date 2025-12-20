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
 * Obtener todos los usuarios desde Firestore
 */
const getAllUsersFromFirestore = async () => {
  try {
    const usersSnapshot = await db.collection('users').get();
    const users = [];

    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      const subscriptionStatus = await checkSubscriptionStatus(doc.id);

      users.push({
        uid: doc.id,
        email: userData.email,
        displayName: userData.displayName || 'Sin nombre',
        role: userData.role || 'user',
        status: userData.status,
        createdAt: userData.createdAt,
        lastLogin: userData.lastLogin,
        authProvider: userData.authProvider,
        subscriptionExpiresAt: userData.subscriptionExpiresAt,
        daysRemaining: subscriptionStatus.daysRemaining,
        isExpired: subscriptionStatus.isExpired
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
  // Nuevas funciones de suscripción
  SUBSCRIPTION_CONFIG,
  activateSuscriptor,
  activateVipTrial,
  activateVipAnnual,
  getSubscriptionStatus
};

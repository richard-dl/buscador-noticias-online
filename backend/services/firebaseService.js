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
 * - 'user': usuario básico (trial de 30 días)
 * - 'suscriptor': suscripción vitalicia (después de trial)
 * - 'vip': suscriptor con acceso a Zona VIP (renovación anual)
 * - 'admin': administrador
 */

/**
 * Crear usuario en Firestore con suscripción trial de 30 días
 */
const createUserInFirestore = async (uid, userData) => {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 días

  const userDoc = {
    uid,
    email: userData.email,
    displayName: userData.displayName || '',
    authProvider: userData.authProvider || 'email',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
    status: 'trial', // trial, active, expired
    role: 'user', // user, suscriptor, vip, admin
    vipExpiresAt: null, // Fecha de expiración VIP (solo para rol vip)
    lastLogin: admin.firestore.FieldValue.serverTimestamp(),
    searchProfilesCount: 0
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
 * Actualizar rol de usuario
 */
const updateUserRole = async (uid, newRole, vipExpiresAt = null) => {
  const validRoles = ['user', 'suscriptor', 'vip', 'admin'];
  if (!validRoles.includes(newRole)) {
    throw new Error('Rol inválido');
  }

  const updateData = { role: newRole };

  if (newRole === 'vip' && vipExpiresAt) {
    updateData.vipExpiresAt = admin.firestore.Timestamp.fromDate(new Date(vipExpiresAt));
  } else if (newRole !== 'vip') {
    updateData.vipExpiresAt = null;
  }

  await db.collection('users').doc(uid).update(updateData);
  return getUserFromFirestore(uid);
};

/**
 * Verificar si el usuario tiene acceso VIP
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

  // Solo rol vip tiene acceso
  if (user.role !== 'vip') {
    return { hasAccess: false, reason: 'Requiere suscripción VIP' };
  }

  // Verificar que la suscripción VIP no haya expirado
  const now = new Date();
  const vipExpiresAt = user.vipExpiresAt?.toDate();

  if (vipExpiresAt && now > vipExpiresAt) {
    // Degradar a suscriptor si expiró VIP
    await db.collection('users').doc(uid).update({ role: 'suscriptor', vipExpiresAt: null });
    return { hasAccess: false, reason: 'Suscripción VIP expirada', expiredAt: vipExpiresAt };
  }

  const daysRemaining = vipExpiresAt ? Math.ceil((vipExpiresAt - now) / (1000 * 60 * 60 * 24)) : null;

  return {
    hasAccess: true,
    role: user.role,
    vipExpiresAt: vipExpiresAt,
    daysRemaining: daysRemaining
  };
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
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await contentRef.set(content);
  return { id: contentRef.id, ...content };
};

/**
 * Obtener contenido VIP
 */
const getVipContent = async (limit = 50) => {
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
  deleteVipContent
};

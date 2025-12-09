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
  verifyIdToken
};

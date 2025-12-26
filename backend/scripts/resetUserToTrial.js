/**
 * Script para resetear un usuario a trial
 * Uso: node scripts/resetUserToTrial.js
 */

require('dotenv').config();
const admin = require('firebase-admin');

// Inicializar Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  });
}

const db = admin.firestore();

async function resetUserToTrial(email) {
  try {
    // Buscar usuario por email
    const usersSnapshot = await db.collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      console.log(`Usuario con email ${email} no encontrado`);
      return;
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();

    console.log('\n=== Usuario encontrado ===');
    console.log('UID:', userDoc.id);
    console.log('Email:', userData.email);
    console.log('Rol actual:', userData.role);

    // Resetear a trial
    await db.collection('users').doc(userDoc.id).update({
      role: 'trial',
      // Limpiar campos de suscripción para permitir nueva compra
      subscriptionPaidAt: admin.firestore.FieldValue.delete(),
      vipTrialExpiresAt: admin.firestore.FieldValue.delete(),
      vipExpiresAt: admin.firestore.FieldValue.delete(),
      vipPaidAt: admin.firestore.FieldValue.delete(),
      lastPaymentId: admin.firestore.FieldValue.delete(),
      lastVipPaymentId: admin.firestore.FieldValue.delete()
    });

    console.log('\n✓ Usuario reseteado a TRIAL exitosamente');
    console.log('Ahora puede probar el flujo de pago desde cero');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

// Ejecutar
resetUserToTrial('ricardodl62@hotmail.com');

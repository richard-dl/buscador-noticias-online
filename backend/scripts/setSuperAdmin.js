/**
 * Script para establecer un usuario como superadmin
 * Uso: node scripts/setSuperAdmin.js email@example.com
 */

require('dotenv').config();
const { db } = require('../services/firebaseService');

const email = process.argv[2] || 'ricardodl@outlook.com';

async function setSuperAdmin() {
  try {
    // Buscar usuario por email
    const usersSnapshot = await db.collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      console.log(`❌ Usuario no encontrado: ${email}`);
      process.exit(1);
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();
    const uid = userDoc.id;

    console.log('\n========================================');
    console.log(`Usuario encontrado: ${userData.email}`);
    console.log(`UID: ${uid}`);
    console.log(`Rol actual: ${userData.role}`);
    console.log('========================================\n');

    // Actualizar rol a superadmin
    await db.collection('users').doc(uid).update({
      role: 'superadmin'
    });

    console.log(`✅ Usuario ${email} ahora es SUPERADMIN`);
    console.log('\n========================================\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit(0);
}

setSuperAdmin();

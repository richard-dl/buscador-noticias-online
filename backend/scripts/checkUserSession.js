/**
 * Script para verificar configuración de sesiones de un usuario
 * Uso: node scripts/checkUserSession.js email@example.com
 */

require('dotenv').config();
const { db, getActiveSessions } = require('../services/firebaseService');

const email = process.argv[2] || 'ricardodl62@hotmail.com';

async function checkUser() {
  try {
    // Buscar usuario por email
    const usersSnapshot = await db.collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      console.log(`❌ Usuario no encontrado: ${email}`);
      return;
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();
    const uid = userDoc.id;

    console.log('\n========================================');
    console.log(`Usuario: ${userData.email}`);
    console.log(`UID: ${uid}`);
    console.log(`Rol: ${userData.role}`);
    console.log('========================================\n');

    console.log('Configuración de sesiones:');
    console.log(`  - singleSessionMode: ${userData.singleSessionMode}`);
    console.log(`  - Tipo de singleSessionMode: ${typeof userData.singleSessionMode}`);
    console.log(`  - maxSessions: ${userData.maxSessions || 'no definido (usa default)'}`);

    // Obtener sesiones activas
    const sessions = await getActiveSessions(uid);

    console.log(`\nSesiones activas: ${sessions.length}`);
    sessions.forEach((s, i) => {
      console.log(`\n  Sesión ${i + 1}:`);
      console.log(`    - ID: ${s.id}`);
      console.log(`    - Device: ${s.deviceInfo?.browser || 'N/A'} en ${s.deviceInfo?.os || 'N/A'}`);
      console.log(`    - IP: ${s.ip}`);
      console.log(`    - Creada: ${s.createdAt?.toDate?.()?.toISOString() || 'N/A'}`);
      console.log(`    - Última actividad: ${s.lastActivity?.toDate?.()?.toISOString() || 'N/A'}`);
    });

    console.log('\n========================================\n');

  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

checkUser();

import admin from 'firebase-admin';

/* 🔐 Service Account desde variables de entorno */
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

/* 🚀 Inicializar Firebase SOLO UNA VEZ */
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      serviceAccount as admin.ServiceAccount
    ),
  });
}

export const firestore = admin.firestore();
export default admin;

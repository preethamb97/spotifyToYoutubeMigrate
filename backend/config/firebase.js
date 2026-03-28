const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const config = {
    projectId: process.env.FIREBASE_PROJECT_ID,
  };

  // Use individual service account credentials from environment variables
  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    config.credential = admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });
    console.log('Firebase Admin initialized with service account credentials');
  } else {
    console.log('Firebase Admin initialized with project ID:', config.projectId);
    console.log('Note: Set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY for full functionality');
  }

  admin.initializeApp(config);
}

const auth = admin.auth();

module.exports = { admin, auth };

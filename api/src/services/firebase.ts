import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import logger from '../utils/logger';

let db: admin.firestore.Firestore;

export const initializeFirebase = () => {
  try {
    if (admin.apps.length === 0) {
      // Initialize Firebase Admin SDK
      if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: process.env.FIREBASE_PROJECT_ID,
        });
      } else {
        // Use default credentials in production (Google Cloud environment)
        admin.initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID,
        });
      }

      db = getFirestore();
      logger.info('✅ Firebase Admin SDK initialized successfully');
    }
  } catch (error) {
    logger.error('❌ Failed to initialize Firebase Admin SDK:', error);
    throw error;
  }
};

export const getDb = () => {
  if (!db) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  }
  return db;
};

export { admin };

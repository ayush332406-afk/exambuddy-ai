import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;

const app = initializeApp({
  credential: applicationDefault(),
  projectId: projectId,
});

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);

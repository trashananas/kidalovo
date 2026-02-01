import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

export function initializeFirebase() {
  const isKeyValid = (key: any) => 
    typeof key === 'string' && 
    key.trim().length > 10 && 
    key.trim().startsWith('AIza');

  const isConfigValid = 
    isKeyValid(firebaseConfig.apiKey) &&
    typeof firebaseConfig.projectId === 'string' && 
    firebaseConfig.projectId.length > 0 &&
    firebaseConfig.projectId !== 'undefined';

  if (typeof window === 'undefined') {
    return {
      firebaseApp: null as any,
      auth: null as any,
      firestore: null as any,
      storage: null as any,
    };
  }

  if (!isConfigValid) {
    return {
      firebaseApp: null as any,
      auth: null as any,
      firestore: null as any,
      storage: null as any,
    };
  }

  if (getApps().length) {
    const app = getApp();
    return getSdks(app);
  }

  try {
    const firebaseApp = initializeApp(firebaseConfig);
    return getSdks(firebaseApp);
  } catch (error) {
    console.error('Firebase init error:', error);
    return {
      firebaseApp: null as any,
      auth: null as any,
      firestore: null as any,
      storage: null as any,
    };
  }
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
    storage: getStorage(firebaseApp),
  };
}

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

export function initializeFirebase() {
  const isKeyPresent = (key: any) => 
    typeof key === 'string' && key.length > 0;

  const isConfigPresent = 
    isKeyPresent(firebaseConfig.apiKey) &&
    typeof firebaseConfig.projectId === 'string' && 
    firebaseConfig.projectId.length > 0;

  if (typeof window === 'undefined') {
    return {
      firebaseApp: null as any,
      auth: null as any,
      firestore: null as any,
      storage: null as any,
    };
  }

  if (!isConfigPresent) {
    // In many development environments, config might be injected later.
    // Return mock SDKs that will be replaced when config is available.
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
    console.error('Firebase initialization error:', error);
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

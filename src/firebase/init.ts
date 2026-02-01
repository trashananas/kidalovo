
import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

export function initializeFirebase() {
  const isConfigValid = !!firebaseConfig.apiKey && !!firebaseConfig.projectId;

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
    return getSdks(getApp());
  }

  try {
    const firebaseApp = initializeApp(firebaseConfig);
    return getSdks(firebaseApp);
  } catch (error) {
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

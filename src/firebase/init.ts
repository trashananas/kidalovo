import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

export function initializeFirebase() {
  if (typeof window === 'undefined') {
    return {
      firebaseApp: null as any,
      auth: null as any,
      firestore: null as any,
      storage: null as any,
    };
  }

  // Если SDK уже инициализирован, возвращаем его
  if (getApps().length) {
    const app = getApp();
    return getSdks(app);
  }

  // Если конфигурация отсутствует, пробуем инициализировать пустую заглушку, 
  // чтобы хуки не падали, либо просто инициализируем (SDK сам выдаст ошибку, если API key невалиден)
  try {
    const firebaseApp = initializeApp(firebaseConfig);
    return getSdks(firebaseApp);
  } catch (error) {
    console.warn('Firebase initialization attempt:', error);
    // В случае критической ошибки возвращаем "мнимые" SDK, чтобы приложение не падало на старте
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

import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Database, getDatabase } from 'firebase/database';
import { Auth, getAuth } from 'firebase/auth';
import { FirebaseConfig } from '../types/types';


class FirebaseService {
  private static instance: FirebaseService;
  private app: FirebaseApp | undefined;
  private _database: Database | undefined;
  private _auth: Auth | undefined;

  private constructor() {
    this.initializeFirebase();
  }

  private initializeFirebase(): void {
    if (typeof window === 'undefined' || getApps().length > 0) return;

    const config: FirebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID!,
    };

    try {
      this.app = initializeApp(config);
      this._database = getDatabase(this.app);
      this._auth = getAuth(this.app);
    } catch (error) {
      console.error('Firebase initialization error:', error);
      throw new Error('Failed to initialize Firebase');
    }
  }

  public static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService();
    }
    return FirebaseService.instance;
  }

  get database(): Database {
    if (!this._database) throw new Error('Database not initialized');
    return this._database;
  }

  get auth(): Auth {
    if (!this._auth) throw new Error('Auth not initialized');
    return this._auth;
  }
}

export const firebaseService = FirebaseService.getInstance();
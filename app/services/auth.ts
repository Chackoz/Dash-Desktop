import { signOut } from 'firebase/auth';
import { firebaseService } from './firebase';


export class AuthService {
  static async logout(): Promise<void> {
    try {
      const auth = firebaseService.auth;
      if (!auth) {
        console.error('Database not found');
        return;
      }
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw new Error('Failed to sign out');
    }
  }
}
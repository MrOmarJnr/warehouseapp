import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc,
  onSnapshot
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updatePassword,
  updateProfile,
  getAuth
} from 'firebase/auth';
import { db, auth } from '../firebase';
import { User, UserRole } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const userService = {
  async createUser(data: Partial<User> & { password?: string }) {
    const { password, ...userData } = data;
    
    try {
      // Create in Firebase Auth first
      // We use username@app.local as a dummy email for Firebase Auth
      const email = `${userData.username}@app.local`;
      const userCredential = await createUserWithEmailAndPassword(auth, email, password || 'Password123!');
      const uid = userCredential.user.uid;

      // Update profile with name
      await updateProfile(userCredential.user, {
        displayName: `${userData.firstName} ${userData.lastName}`
      });

      const newUser: User = {
        id: uid,
        companyId: userData.companyId || '',
        role: userData.role || 'AT_WAREHOUSE',
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        email: userData.email || email,
        username: userData.username || '',
        isActive: true,
        createdAt: new Date().toISOString(),
        ...userData
      };

      await setDoc(doc(db, 'users', uid), newUser);
      return uid;
    } catch (error: any) {
      if (error.code === 'auth/operation-not-allowed') {
        throw new Error('Email/Password authentication is not enabled in the Firebase Console. Please enable it in the Auth section.');
      }
      if (error.code === 'auth/email-already-in-use') {
        throw new Error(`The username "${userData.username}" is already taken. Please choose a different one.`);
      }
      handleFirestoreError(error, OperationType.WRITE, 'users');
      throw error;
    }
  },

  async login(username: string, password: string) {
    try {
      const email = `${username}@app.local`;
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      return userDoc.data() as User;
    } catch (error: any) {
      if (error.code === 'auth/operation-not-allowed') {
        throw new Error('Email/Password authentication is not enabled in the Firebase Console. Please enable it in the Auth section.');
      }
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        throw new Error('Invalid username or password.');
      }
      handleFirestoreError(error, OperationType.GET, 'users');
      throw error;
    }
  },

  async getUsers() {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
      throw error;
    }
  },

  async getUser(uid: string) {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        return { id: userDoc.id, ...userDoc.data() } as User;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${uid}`);
      throw error;
    }
  },

  subscribeToUsers(callback: (users: User[]) => void) {
    return onSnapshot(collection(db, 'users'), (snapshot) => {
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      callback(users);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
  },

  async resetPassword(userId: string, newPassword: string) {
    try {
      console.log(`Resetting password for ${userId} to ${newPassword}`);
      await updateDoc(doc(db, 'users', userId), {
        passwordResetRequired: true,
        tempPassword: newPassword
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
      throw error;
    }
  },

  async updateUser(userId: string, data: Partial<User>) {
    try {
      await updateDoc(doc(db, 'users', userId), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
      throw error;
    }
  },

  async bootstrapAdmin() {
    const adminEmail = 'admin@app.local';
    const adminPassword = 'Password123!';

    try {
      // Try to create the admin user in Firebase Auth
      // If this succeeds, the admin user will be logged in
      const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
      const uid = userCredential.user.uid;

      console.log('No users found. Creating default super admin...');
      
      const newUser: User = {
        id: uid,
        username: 'admin',
        role: 'SUPER_ADMIN',
        firstName: 'Super',
        lastName: 'Admin',
        email: 'admin@logistics.com',
        companyId: 'SYSTEM',
        isActive: true,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', uid), newUser);
      return true;
    } catch (error: any) {
      // If email already exists, bootstrap is already done
      if (error.code === 'auth/email-already-in-use') {
        return false;
      }
      
      // If email/password is disabled, we catch it here too
      if (error.code === 'auth/operation-not-allowed') {
        console.warn('Email/Password auth not enabled. Please enable it in Firebase Console.');
        return false;
      }

      // For other errors (like permission denied on a check we didn't do but might happen)
      if (error.code === 'permission-denied') {
        return false;
      }

      console.error('Bootstrap error:', error);
      return false;
    }
  }
};

import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { BehaviorSubject, Observable } from 'rxjs';
import { Capacitor } from '@capacitor/core';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
const auth = getAuth(app);

export interface NotificationRecord {
  id?: string;
  appName: string;
  titleText: string;
  body: string;
  persona: string;
  summary: string;
  category: string;
  priority: string;
  actionItems?: string[];
  suggestedReply?: string;
  userId: string;
  createdAt: any;
}

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private userSub = new BehaviorSubject<User | null>(null);
  user$ = this.userSub.asObservable();

  private notificationsSub = new BehaviorSubject<NotificationRecord[]>([]);
  notifications$ = this.notificationsSub.asObservable();

  private unsubscribeSnapshot: any;

  isLoading = false;
  error: string | null = null;

  constructor() {
    this.testConnection();

    // Handle the redirect result when the app starts
    getRedirectResult(auth).catch(err => {
      console.error("Redirect login result error:", err);
      if (err.message?.includes('auth/operation-not-supported-in-this-environment')) {
        // Fallback or ignore if not supported
      }
    });

    onAuthStateChanged(auth, (user) => {
      this.userSub.next(user);
      if (user) {
        this.subscribeToNotifications(user.uid);
      } else {
        if (this.unsubscribeSnapshot) {
          this.unsubscribeSnapshot();
          this.unsubscribeSnapshot = null;
        }
        this.notificationsSub.next([]);
      }
    });
  }

  async testConnection() {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (error: any) {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.error("Please check your Firebase configuration.");
      }
    }
  }

  async login() {
    this.isLoading = true;
    this.error = null;
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      if (Capacitor.isNativePlatform()) {
        // "Normal" way for mobile: Redirect to Google login in browser
        await signInWithRedirect(auth, provider);
      } else {
        // Standard way for web: Popup login
        await signInWithPopup(auth, provider);
      }
    } catch (error: any) {
      console.error("Login failed:", error);
      this.error = "Login Error: " + error.message;
    } finally {
      this.isLoading = false;
    }
  }

  async logout() {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }

  subscribeToNotifications(userId: string) {
    if (this.unsubscribeSnapshot) {
      this.unsubscribeSnapshot();
    }
    const q = query(collection(db, 'users', userId, 'notifications'), orderBy('createdAt', 'desc'));
    this.unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
      const records: NotificationRecord[] = [];
      snapshot.forEach(d => {
        records.push({ id: d.id, ...d.data() } as NotificationRecord);
      });
      this.notificationsSub.next(records);
    }, this.handleFirestoreError);
  }

  async addNotification(record: Omit<NotificationRecord, 'id' | 'createdAt' | 'userId'>) {
    const user = this.userSub.value;
    if (!user) throw new Error("Must be logged in to save notifications");

    const payload = {
      ...record,
      userId: user.uid,
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'users', user.uid, 'notifications'), payload);
    } catch (error) {
      this.handleFirestoreError(error);
      throw error;
    }
  }

  private handleFirestoreError(error: any) {
    // Implementing strictly as requested by instructions
    if (error?.message?.includes('Missing or insufficient permissions')) {
      const authInfo = auth.currentUser ? {
        userId: auth.currentUser.uid,
        email: auth.currentUser.email,
        emailVerified: auth.currentUser.emailVerified,
        isAnonymous: auth.currentUser.isAnonymous,
        providerInfo: auth.currentUser.providerData
      } : null;

      const errorInfo = {
        error: error.message,
        operationType: 'write', // Fallback, could be better typed
        path: null,
        authInfo
      };
      throw new Error(JSON.stringify(errorInfo));
    }
    console.error("Firestore Error:", error);
  }
}

import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, initializeFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, onSnapshot, updateDoc, deleteDoc, addDoc, serverTimestamp, Timestamp, getDocFromServer, orderBy, writeBatch, arrayUnion, runTransaction, limit } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

// Configuration check
export const isFirebaseConfigured = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== "TODO_KEYHERE";

let app: FirebaseApp;
if (isFirebaseConfigured) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
} else {
  app = { options: {} } as any;
  console.warn("Firebase configuration is missing. Please set up Firebase using the tool.");
}

// Initialize Firestore with long polling for better stability in some environments
export const db = isFirebaseConfigured 
  ? initializeFirestore(app, {
      experimentalForceLongPolling: true,
    }, firebaseConfig.firestoreDatabaseId)
  : null as any;

export const auth = isFirebaseConfigured ? getAuth(app) : null as any;
export const storage = isFirebaseConfigured ? getStorage(app) : null as any;
export const googleProvider = new GoogleAuthProvider();

// Secondary app for admin tasks (creating users without logging out)
export const getSecondaryAuth = () => {
  if (!isFirebaseConfigured) return null;
  const secondaryAppName = "SecondaryApp";
  const secondaryApp = getApps().find(app => app.name === secondaryAppName) || initializeApp(firebaseConfig, secondaryAppName);
  return getAuth(secondaryApp);
};

// Test connection to Firestore
async function testConnection() {
  if (!isFirebaseConfigured) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is offline.");
    }
  }
}
testConnection();

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  Timestamp,
  orderBy,
  writeBatch,
  arrayUnion,
  runTransaction,
  limit,
  ref,
  uploadBytes,
  getDownloadURL
};
export type { User };

import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, onSnapshot, updateDoc, deleteDoc, addDoc, serverTimestamp, Timestamp, getDocFromServer, orderBy, writeBatch, arrayUnion, runTransaction } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

// Configuration check
export const isFirebaseConfigured = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== "TODO_KEYHERE";

let app;
if (isFirebaseConfigured) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
} else {
  app = { options: {} } as any;
  console.warn("Firebase configuration is missing. Please set up Firebase using the tool.");
}

export const db = isFirebaseConfigured ? getFirestore(app, firebaseConfig.firestoreDatabaseId) : null as any;
export const auth = isFirebaseConfigured ? getAuth(app) : null as any;
export const storage = isFirebaseConfigured ? getStorage(app) : null as any;
export const googleProvider = new GoogleAuthProvider();

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
  ref,
  uploadBytes,
  getDownloadURL
};
export type { User };

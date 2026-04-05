import { db, auth, collection, addDoc, serverTimestamp } from '../firebase';

export const logActivity = async (action: string, module: string, details: string) => {
  if (!auth.currentUser) return;

  try {
    await addDoc(collection(db, 'activityLogs'), {
      userId: auth.currentUser.uid,
      userName: auth.currentUser.displayName || auth.currentUser.email,
      action,
      module,
      details,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  orderBy, 
  serverTimestamp,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Lead } from '../types';

const LEADS_COLLECTION = 'leads';
const USERS_COLLECTION = 'users';

export const dbService = {
  // --- User Profile ---
  async syncUserProfile(user: { uid: string; email: string | null; displayName: string | null; photoURL: string | null }) {
    const userRef = doc(db, USERS_COLLECTION, user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      lastLogin: serverTimestamp()
    }, { merge: true });
  },

  // --- Leads ---
  async saveLead(userId: string, lead: Partial<Lead>) {
    const leadsRef = collection(db, LEADS_COLLECTION);
    const docRef = await addDoc(leadsRef, {
      ...lead,
      userId,
      scrapedAt: new Date().toISOString(),
      createdAt: serverTimestamp()
    });
    return docRef.id;
  },

  async batchSaveLeads(userId: string, leads: Partial<Lead>[]) {
    const promises = leads.map(lead => this.saveLead(userId, lead));
    return Promise.all(promises);
  },

  async fetchUserLeads(userId: string) {
    const leadsRef = collection(db, LEADS_COLLECTION);
    const q = query(
      leadsRef, 
      where('userId', '==', userId),
      orderBy('scrapedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    })) as Lead[];
  },

  async updateLead(leadId: string, updates: Partial<Lead>) {
    const leadRef = doc(db, LEADS_COLLECTION, leadId);
    await updateDoc(leadRef, updates);
  },

  async deleteLead(leadId: string) {
    const leadRef = doc(db, LEADS_COLLECTION, leadId);
    await deleteDoc(leadRef);
  },

  async syncDevNotes(userId: string, notes: string) {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, { devNotes: notes });
  },

  async getDevNotes(userId: string) {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userDoc = await getDoc(userRef);
    return userDoc.exists() ? userDoc.data().devNotes : null;
  }
};

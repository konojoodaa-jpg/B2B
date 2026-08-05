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
    try {
      const userRef = doc(db, USERS_COLLECTION, user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        lastLogin: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.warn("syncUserProfile warning:", e);
    }
  },

  // --- Leads ---
  async saveLead(userId: string, lead: Partial<Lead>) {
    try {
      const leadsRef = collection(db, LEADS_COLLECTION);
      const docRef = await addDoc(leadsRef, {
        ...lead,
        userId,
        scrapedAt: new Date().toISOString(),
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (e) {
      console.error("saveLead error:", e);
      throw e;
    }
  },

  async batchSaveLeads(userId: string, leads: Partial<Lead>[]) {
    const promises = leads.map(lead => this.saveLead(userId, lead).catch(err => {
      console.warn("Failed saving single lead in batch:", err);
      return null;
    }));
    return Promise.all(promises);
  },

  async fetchUserLeads(userId: string) {
    try {
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
    } catch (e) {
      console.error("fetchUserLeads error:", e);
      return [];
    }
  },

  async updateLead(leadId: string, updates: Partial<Lead>) {
    try {
      const leadRef = doc(db, LEADS_COLLECTION, leadId);
      await updateDoc(leadRef, updates);
    } catch (e) {
      console.error("updateLead error:", e);
    }
  },

  async deleteLead(leadId: string) {
    try {
      const leadRef = doc(db, LEADS_COLLECTION, leadId);
      await deleteDoc(leadRef);
    } catch (e) {
      console.error("deleteLead error:", e);
    }
  },

  async syncDevNotes(userId: string, notes: string) {
    try {
      const userRef = doc(db, USERS_COLLECTION, userId);
      await setDoc(userRef, { devNotes: notes }, { merge: true });
    } catch (e) {
      console.error("syncDevNotes error:", e);
    }
  },

  async getDevNotes(userId: string) {
    try {
      const userRef = doc(db, USERS_COLLECTION, userId);
      const userDoc = await getDoc(userRef);
      return userDoc.exists() ? userDoc.data().devNotes : null;
    } catch (e) {
      console.error("getDevNotes error:", e);
      return null;
    }
  }
};

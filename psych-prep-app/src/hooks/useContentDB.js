import { useState, useEffect, useCallback, useRef } from "react";
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc,
  query, where, getDocs, writeBatch, setDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { SEED_DB } from "../data/seed";

// Local key -> Firestore collection name
const COLLECTIONS = {
  categories: "categories",
  topics: "topics",
  persons: "persons",
  quiz: "quizQuestions",
  flashcards: "flashcards",
  research: "researchSections",
};

const EMPTY_DB = { categories: [], topics: [], persons: [], quiz: [], flashcards: [], research: [] };

export function useContentDB() {
  const [db_, setDb] = useState(EMPTY_DB);
  const [loadedFlags, setLoadedFlags] = useState({});
  const dbRef = useRef(EMPTY_DB);
  dbRef.current = db_;

  useEffect(() => {
    const unsubs = Object.entries(COLLECTIONS).map(([listKey, collName]) =>
      onSnapshot(
        collection(db, collName),
        (snap) => {
          const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setDb((prev) => ({ ...prev, [listKey]: items }));
          setLoadedFlags((prev) => ({ ...prev, [listKey]: true }));
        },
        (e) => {
          console.error(`content subscription failed for ${collName}`, e);
          setLoadedFlags((prev) => ({ ...prev, [listKey]: true }));
        }
      )
    );
    return () => unsubs.forEach((u) => u());
  }, []);

  const loaded = Object.keys(COLLECTIONS).every((k) => loadedFlags[k]);

  const addItem = useCallback(async (listKey, item) => {
    const { id, ...rest } = item; // Firestore assigns its own id
    try {
      await addDoc(collection(db, COLLECTIONS[listKey]), rest);
    } catch (e) {
      console.error(`add failed for ${listKey}`, e);
      throw e;
    }
  }, []);

  const updateItem = useCallback(async (listKey, id, patch) => {
    try {
      await updateDoc(doc(db, COLLECTIONS[listKey], id), patch);
    } catch (e) {
      console.error(`update failed for ${listKey}/${id}`, e);
      throw e;
    }
  }, []);

  const deleteItem = useCallback(async (listKey, id) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS[listKey], id));
    } catch (e) {
      console.error(`delete failed for ${listKey}/${id}`, e);
      throw e;
    }
  }, []);

  // Deleting a category cascades to everything referencing it.
  const deleteCategory = useCallback(async (categoryId) => {
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, "categories", categoryId));
      const cascadeCollections = ["topics", "persons", "quizQuestions", "flashcards"];
      for (const collName of cascadeCollections) {
        const q = query(collection(db, collName), where("categoryId", "==", categoryId));
        const snap = await getDocs(q);
        snap.forEach((d) => batch.delete(d.ref));
      }
      await batch.commit();
    } catch (e) {
      console.error("category cascade delete failed", e);
      throw e;
    }
  }, []);

  // One-time helper for a brand-new Firebase project: writes the starter
  // content set using the SAME ids as the seed data, so categoryId
  // references between topics/persons/quiz/flashcards and categories stay valid.
  const seedStarterContent = useCallback(async () => {
    if (dbRef.current.categories.length > 0) {
      throw new Error("Content already exists — starter content only seeds an empty database.");
    }
    const batch = writeBatch(db);
    for (const [listKey, collName] of Object.entries(COLLECTIONS)) {
      for (const item of SEED_DB[listKey]) {
        const { id, ...rest } = item;
        batch.set(doc(db, collName, id), rest);
      }
    }
    await batch.commit();
  }, []);

  return { db: db_, loaded, addItem, updateItem, deleteItem, deleteCategory, seedStarterContent };
}

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
          let items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          // Research sections are read top-to-bottom, so they need a stable,
          // admin-controlled order instead of Firestore's unspecified default order.
          if (listKey === "research") {
            items = items
              .map((item, i) => ({ item, i }))
              .sort((a, b) => {
                const orderA = typeof a.item.order === "number" ? a.item.order : Infinity;
                const orderB = typeof b.item.order === "number" ? b.item.order : Infinity;
                if (orderA !== orderB) return orderA - orderB;
                return a.i - b.i; // stable fallback for items without an order value
              })
              .map((x) => x.item);
          }
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

  // Returns the full content set as a plain object, ready to JSON.stringify
  // for a file download. Uses the live in-memory state, not a fresh read.
  const exportContent = useCallback(() => {
    return JSON.parse(JSON.stringify(dbRef.current));
  }, []);

  // Imports a previously exported (or hand-edited) content object.
  // Behavior: UPSERT only — items with an existing "id" are updated in place,
  // items without one are created as new documents. Nothing is ever deleted
  // by import; remove unwanted items manually in the relevant Admin tab.
  // Returns a summary of how many items were written per content type.
  const importContent = useCallback(async (data) => {
    if (!data || typeof data !== "object") {
      throw new Error("That file doesn't look like a valid content export.");
    }
    const summary = {};
    const ops = [];
    for (const [listKey, collName] of Object.entries(COLLECTIONS)) {
      const list = Array.isArray(data[listKey]) ? data[listKey] : [];
      summary[listKey] = list.length;
      for (const item of list) {
        const { id, ...rest } = item;
        if (id) ops.push({ ref: doc(db, collName, id), data: rest, merge: true });
        else ops.push({ ref: doc(collection(db, collName)), data: rest, merge: false });
      }
    }
    // Firestore batches cap at 500 operations — chunk defensively.
    for (let i = 0; i < ops.length; i += 450) {
      const batch = writeBatch(db);
      for (const op of ops.slice(i, i + 450)) {
        batch.set(op.ref, op.data, op.merge ? { merge: true } : {});
      }
      await batch.commit();
    }
    return summary;
  }, []);

  return { db: db_, loaded, addItem, updateItem, deleteItem, deleteCategory, seedStarterContent, exportContent, importContent };
}

import { useState, useEffect, useCallback, useRef } from "react";
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
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
  dailyPosts: "dailyPosts",
  caseStudies: "caseStudies",
  journals: "journals",
  publicTopics: "publicTopics",
};

const EMPTY_DB = { categories: [], topics: [], persons: [], quiz: [], flashcards: [], research: [], dailyPosts: [], caseStudies: [], journals: [] };

// Applies the same "stable, admin-controlled order" fixups the old
// real-time listener used to apply per-snapshot.
function normalizeItems(listKey, rawItems) {
  let items = rawItems;
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
  if (listKey === "dailyPosts") {
    items = [...items].sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
  }
  return items;
}

// publicTopics is the one collection readable without auth (see
// firestore.rules) — it powers the logged-out shared-link preview, so it's
// fetched unconditionally. Everything else requires a signed-in user.
const PUBLIC_COLLECTIONS = ["publicTopics"];

export function useContentDB(uid) {
  const [db_, setDb] = useState(EMPTY_DB);
  const [loadedFlags, setLoadedFlags] = useState({});
  const dbRef = useRef(EMPTY_DB);
  dbRef.current = db_;

  // One-time fetch of a single collection (used both for the initial load
  // and to refresh just the affected collection after a write). Content
  // here is admin-edited reference material, not something that needs a
  // live socket per viewer — a real-time onSnapshot per collection was
  // costing a full collection read for every connected client on every
  // single write anyone made, which is what drove the read spike.
  const fetchCollection = useCallback(async (listKey) => {
    const collName = COLLECTIONS[listKey];
    try {
      const snap = await getDocs(collection(db, collName));
      const items = normalizeItems(listKey, snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setDb((prev) => ({ ...prev, [listKey]: items }));
      setLoadedFlags((prev) => ({ ...prev, [listKey]: true }));
      return items;
    } catch (e) {
      console.error(`content fetch failed for ${collName}`, e);
      setLoadedFlags((prev) => ({ ...prev, [listKey]: true }));
      return [];
    }
  }, []);

  // publicTopics loads once, regardless of auth state.
  useEffect(() => {
    fetchCollection("publicTopics");
  }, [fetchCollection]);

  // Everything else needs a signed-in user (per firestore.rules).
  useEffect(() => {
    const authCollections = Object.keys(COLLECTIONS).filter((k) => !PUBLIC_COLLECTIONS.includes(k));
    if (!uid) {
      setDb((prev) => ({ ...EMPTY_DB, publicTopics: prev.publicTopics }));
      setLoadedFlags((prev) => {
        const next = {};
        authCollections.forEach((k) => { next[k] = false; });
        if (prev.publicTopics) next.publicTopics = true;
        return next;
      });
      return;
    }
    authCollections.forEach((listKey) => fetchCollection(listKey));
  }, [uid, fetchCollection]);

  // Logged-out visitors only ever get publicTopics (the rest require auth
  // and are never fetched — see the effect above), so "loaded" for them
  // means just that one collection, not all ten.
  const loaded = uid
    ? Object.keys(COLLECTIONS).every((k) => loadedFlags[k])
    : Boolean(loadedFlags.publicTopics);

  const addItem = useCallback(async (listKey, item) => {
    const { id, ...rest } = item; // Firestore assigns its own id
    try {
      await addDoc(collection(db, COLLECTIONS[listKey]), rest);
      await fetchCollection(listKey);
    } catch (e) {
      console.error(`add failed for ${listKey}`, e);
      throw e;
    }
  }, [fetchCollection]);

  const publishTopic = useCallback(async (topic) => {
    const { id, ...data } = topic;
    await setDoc(doc(db, "publicTopics", id), { ...data, sourceId: id, publishedAt: new Date().toISOString() });
    await fetchCollection("publicTopics");
  }, [fetchCollection]);

  const unpublishTopic = useCallback(async (topicId) => {
    await deleteDoc(doc(db, "publicTopics", topicId));
    await fetchCollection("publicTopics");
  }, [fetchCollection]);

  const updateItem = useCallback(async (listKey, id, patch) => {
    try {
      await updateDoc(doc(db, COLLECTIONS[listKey], id), patch);
      await fetchCollection(listKey);
    } catch (e) {
      console.error(`update failed for ${listKey}/${id}`, e);
      throw e;
    }
  }, [fetchCollection]);

  const deleteItem = useCallback(async (listKey, id) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS[listKey], id));
      await fetchCollection(listKey);
    } catch (e) {
      console.error(`delete failed for ${listKey}/${id}`, e);
      throw e;
    }
  }, [fetchCollection]);

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
      await Promise.all(["categories", "topics", "persons", "quiz", "flashcards"].map(fetchCollection));
    } catch (e) {
      console.error("category cascade delete failed", e);
      throw e;
    }
  }, [fetchCollection]);

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
    await Promise.all(Object.keys(COLLECTIONS).map(fetchCollection));
  }, [fetchCollection]);

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
    await Promise.all(Object.keys(COLLECTIONS).map(fetchCollection));
    return summary;
  }, [fetchCollection]);

  return { db: db_, loaded, addItem, updateItem, deleteItem, deleteCategory, publishTopic, unpublishTopic, seedStarterContent, exportContent, importContent };
}

import { useState, useEffect, useCallback } from "react";
import { doc, onSnapshot, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

const DEFAULT_PROFILE = {
  name: "",
  focusCategories: [],
  bookmarks: [],
  readTopics: [],
  quizHistory: [],
  flashcardStatus: {},
};

// Real-time profile doc for the signed-in user. Auto-creates the doc on first login.
export function useProfile(uid) {
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!uid) { setProfile(DEFAULT_PROFILE); setLoaded(false); return; }
    const ref = doc(db, "users", uid);
    let cancelled = false;

    (async () => {
      try {
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          await setDoc(ref, DEFAULT_PROFILE);
        }
      } catch (e) {
        console.error("profile init failed", e);
      }
    })();

    const unsub = onSnapshot(ref, (snap) => {
      if (cancelled) return;
      if (snap.exists()) setProfile({ ...DEFAULT_PROFILE, ...snap.data() });
      setLoaded(true);
    }, (e) => { console.error("profile subscription error", e); setLoaded(true); });

    return () => { cancelled = true; unsub(); };
  }, [uid]);

  const update = useCallback(async (patch) => {
    if (!uid) return;
    try {
      await setDoc(doc(db, "users", uid), patch, { merge: true });
    } catch (e) {
      console.error("profile update failed", e);
    }
  }, [uid]);

  const toggleBookmark = useCallback((topicId) => {
    setProfile((prev) => {
      const has = prev.bookmarks.includes(topicId);
      const bookmarks = has ? prev.bookmarks.filter((id) => id !== topicId) : [...prev.bookmarks, topicId];
      update({ bookmarks });
      return { ...prev, bookmarks };
    });
  }, [update]);

  const markRead = useCallback((topicId) => {
    setProfile((prev) => {
      if (prev.readTopics.includes(topicId)) return prev;
      const readTopics = [...prev.readTopics, topicId];
      update({ readTopics });
      return { ...prev, readTopics };
    });
  }, [update]);

  const addQuizResult = useCallback((result) => {
    setProfile((prev) => {
      const quizHistory = [...prev.quizHistory, result].slice(-30);
      update({ quizHistory });
      return { ...prev, quizHistory };
    });
  }, [update]);

  const setFlashcardStatus = useCallback((cardId, status) => {
    setProfile((prev) => {
      const flashcardStatus = { ...prev.flashcardStatus, [cardId]: status };
      update({ flashcardStatus });
      return { ...prev, flashcardStatus };
    });
  }, [update]);

  return { profile, loaded, update, toggleBookmark, markRead, addQuizResult, setFlashcardStatus };
}

// Admin status lives in a SEPARATE collection that users cannot write to themselves
// (see firestore.rules). Promote a user to admin manually in the Firebase Console:
// Firestore -> "admins" collection -> new document with ID = that user's UID.
export function useIsAdmin(uid) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!uid) { setIsAdmin(false); setLoaded(true); return; }
    const ref = doc(db, "admins", uid);
    const unsub = onSnapshot(
      ref,
      (snap) => { setIsAdmin(snap.exists()); setLoaded(true); },
      (e) => { console.error("admin check failed", e); setIsAdmin(false); setLoaded(true); }
    );
    return unsub;
  }, [uid]);

  return { isAdmin, loaded };
}

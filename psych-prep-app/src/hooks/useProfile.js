import { useState, useEffect, useCallback } from "react";
import { collection, deleteDoc, doc, onSnapshot, setDoc, getDoc, getDocs } from "firebase/firestore";
import { db } from "../firebase";

const DEFAULT_PROFILE = {
  name: "",
  focusCategories: [],
  bookmarks: [],
  readTopics: [],
  quizHistory: [],
  flashcardStatus: {},
  xp: 0,
  streak: { current: 0, longest: 0, lastActiveDate: null },
  badges: [],
  dailyRead: [],
  dailySaved: [],
  completedCaseStudies: [],
};

// XP thresholds for each named level. Level = highest index whose threshold the xp meets.
export const XP_LEVELS = [
  { name: "Psychology Explorer", threshold: 0 },
  { name: "Psychology Student", threshold: 100 },
  { name: "Research Assistant", threshold: 300 },
  { name: "Graduate", threshold: 700 },
  { name: "Clinical Learner", threshold: 1500 },
  { name: "Research Scholar", threshold: 3000 },
  { name: "Psychology Expert", threshold: 6000 },
];

export function getLevelInfo(xp) {
  let idx = 0;
  for (let i = 0; i < XP_LEVELS.length; i++) {
    if (xp >= XP_LEVELS[i].threshold) idx = i;
  }
  const current = XP_LEVELS[idx];
  const next = XP_LEVELS[idx + 1] || null;
  const pct = next ? Math.round(((xp - current.threshold) / (next.threshold - current.threshold)) * 100) : 100;
  return { levelIndex: idx, name: current.name, next, progressPct: Math.min(100, Math.max(0, pct)) };
}

const STREAK_BADGES = [
  { days: 3, id: "streak_3", label: "3-Day Streak" },
  { days: 7, id: "streak_7", label: "7-Day Streak" },
  { days: 14, id: "streak_14", label: "14-Day Streak" },
  { days: 30, id: "streak_30", label: "30-Day Streak" },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function friendlyProfileError(error) {
  const code = error?.code || error?.message || "";
  if (String(code).includes("permission-denied")) {
    return "Firebase Firestore permissions are blocking your profile setup. Publish the rules from firestore.rules and make sure the app is using the correct Firebase project.";
  }
  if (String(code).includes("failed-precondition") || String(code).includes("unavailable")) {
    return "Firebase is temporarily unavailable. Please try again in a moment.";
  }
  if (String(code).includes("invalid-api-key") || String(code).includes("api key")) {
    return "Your Firebase configuration is incomplete. Check the VITE_FIREBASE_* values in your environment.";
  }
  return "We could not initialize your profile. Please check your Firebase setup and try again.";
}

// Real-time profile doc for the signed-in user. Auto-creates the doc on first login.
export function useProfile(uid) {
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [loaded, setLoaded] = useState(false);
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    if (!uid) { setProfile(DEFAULT_PROFILE); setLoaded(false); return; }
    const ref = doc(db, "users", uid);
    let cancelled = false;

    (async () => {
      try {
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          await setDoc(ref, DEFAULT_PROFILE, { merge: true });
        }
        setProfileError("");
      } catch (e) {
        console.error("profile init failed", e);
        setProfileError(friendlyProfileError(e));
      }
    })();

    const unsub = onSnapshot(ref, (snap) => {
      if (cancelled) return;
      if (snap.exists()) setProfile({ ...DEFAULT_PROFILE, ...snap.data() });
      setLoaded(true);
    }, (e) => { console.error("profile subscription error", e); setProfileError(friendlyProfileError(e)); setLoaded(true); });

    return () => { cancelled = true; unsub(); };
  }, [uid]);

  const update = useCallback(async (patch) => {
    if (!uid) return;
    try {
      setProfileError("");
      await setDoc(doc(db, "users", uid), patch, { merge: true });
    } catch (e) {
      console.error("profile update failed", e);
      setProfileError(friendlyProfileError(e));
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
      const isPerfect = result.total > 0 && result.score === result.total;
      const xp = prev.xp + 30 + (isPerfect ? 20 : 0);
      update({ quizHistory, xp });
      return { ...prev, quizHistory, xp };
    });
  }, [update]);

  const setFlashcardStatus = useCallback((cardId, status) => {
    setProfile((prev) => {
      const flashcardStatus = { ...prev.flashcardStatus, [cardId]: status };
      update({ flashcardStatus });
      return { ...prev, flashcardStatus };
    });
  }, [update]);

  // Called once per app load (after profile is ready) to advance the daily
  // streak and award daily-login XP. Safe to call multiple times per day —
  // it only actually changes anything the first time on a given date.
  const recordDailyVisit = useCallback(() => {
    setProfile((prev) => {
      const today = todayStr();
      if (prev.streak.lastActiveDate === today) return prev; // already recorded today

      const wasYesterday = prev.streak.lastActiveDate === yesterdayStr();
      const current = wasYesterday ? prev.streak.current + 1 : 1;
      const longest = Math.max(prev.streak.longest, current);
      const streak = { current, longest, lastActiveDate: today };

      const newlyEarnedBadges = STREAK_BADGES
        .filter((b) => current === b.days && !prev.badges.includes(b.id))
        .map((b) => b.id);
      const badges = newlyEarnedBadges.length ? [...prev.badges, ...newlyEarnedBadges] : prev.badges;

      const xp = prev.xp + 10; // daily login XP
      const next = { ...prev, streak, badges, xp };
      update({ streak, badges, xp });
      return next;
    });
  }, [update]);

  // Marks a Daily Psychology post as read and awards its XP once (repeat
  // completions of the same post's mini-quiz don't award XP again).
  const completeDailyPost = useCallback((postId, xpAward = 40) => {
    setProfile((prev) => {
      if (prev.dailyRead.includes(postId)) return prev;
      const dailyRead = [...prev.dailyRead, postId];
      const xp = prev.xp + xpAward;
      update({ dailyRead, xp });
      return { ...prev, dailyRead, xp };
    });
  }, [update]);

  const toggleSaveDaily = useCallback((postId) => {
    setProfile((prev) => {
      const has = prev.dailySaved.includes(postId);
      const dailySaved = has ? prev.dailySaved.filter((id) => id !== postId) : [...prev.dailySaved, postId];
      update({ dailySaved });
      return { ...prev, dailySaved };
    });
  }, [update]);

  // Marks a case study as fully completed (all three sub-answers given) and
  // awards its XP once — repeat views of an already-completed case study
  // don't award XP again.
  const completeCaseStudy = useCallback((caseId, xpAward = 25) => {
    setProfile((prev) => {
      if (prev.completedCaseStudies.includes(caseId)) return prev;
      const completedCaseStudies = [...prev.completedCaseStudies, caseId];
      const xp = prev.xp + xpAward;
      update({ completedCaseStudies, xp });
      return { ...prev, completedCaseStudies, xp };
    });
  }, [update]);

  return { profile, loaded, profileError, update, toggleBookmark, markRead, addQuizResult, setFlashcardStatus, recordDailyVisit, completeDailyPost, toggleSaveDaily, completeCaseStudy };
}

export const DEFAULT_ADMIN_PERMISSIONS = {
  canManageAdmins: false,
  canImportExport: false,
  categories: false,
  topics: false,
  persons: false,
  quiz: false,
  flashcards: false,
  research: false,
  dailyPosts: false,
  caseStudies: false,
  journals: false,
};

function normalizeAdminData(data) {
  if (!data) return null;
  const permissions = { ...DEFAULT_ADMIN_PERMISSIONS, ...(data.permissions || {}) };
  return {
    role: data.role === "super_admin" ? "super_admin" : "admin",
    permissions,
  };
}

// Admin status lives in a SEPARATE collection that users cannot write to themselves
// (see firestore.rules). Promote a user to admin manually in the Firebase Console:
// Firestore -> "admins" collection -> new document with ID = that user's UID.
export function useIsAdmin(uid) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminData, setAdminData] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!uid) { setIsAdmin(false); setAdminData(null); setLoaded(true); return; }
    const ref = doc(db, "admins", uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = snap.exists() ? normalizeAdminData(snap.data()) : null;
        setAdminData(data);
        setIsAdmin(Boolean(data));
        setLoaded(true);
      },
      (e) => { console.error("admin check failed", e); setIsAdmin(false); setAdminData(null); setLoaded(true); }
    );
    return unsub;
  }, [uid]);

  return { isAdmin, adminData, loaded };
}

// The "admins" collection is only readable by super-admins and admins with
// canManageAdmins permission (see firestore.rules) — everyone else gets a
// permission-denied. A real-time listener here used to be opened for EVERY
// signed-in user unconditionally, which meant most sessions paid for a
// listener that could never legally read anything. Now it's a one-time
// fetch, and only runs at all when `enabled` (the caller decides who
// actually needs it — i.e. only once we know the user can manage admins).
export function useAdminDirectory(enabled) {
  const [admins, setAdmins] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, "admins"));
      const rows = snap.docs.map((docSnap) => ({ uid: docSnap.id, ...normalizeAdminData(docSnap.data()) }));
      setAdmins(rows);
    } catch (e) {
      console.error("admin directory load failed", e);
      setAdmins([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!enabled) { setAdmins([]); setLoaded(true); return; }
    refresh();
  }, [enabled, refresh]);

  const saveAdmin = useCallback(async (uid, payload) => {
    if (!uid) return;
    const data = normalizeAdminData(payload);
    await setDoc(doc(db, "admins", uid), {
      role: data?.role || "admin",
      permissions: data?.permissions || DEFAULT_ADMIN_PERMISSIONS,
    }, { merge: true });
    await refresh();
  }, [refresh]);

  const removeAdmin = useCallback(async (uid) => {
    if (!uid) return;
    await deleteDoc(doc(db, "admins", uid));
    await refresh();
  }, [refresh]);

  return { admins, loaded, saveAdmin, removeAdmin };
}

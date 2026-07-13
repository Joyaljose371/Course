import { useState, useEffect, useCallback } from "react";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "../firebase";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [authLoaded, setAuthLoaded] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoaded(true);
    });
    return unsub;
  }, []);

  const signUp = useCallback(async (email, password) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    return cred.user;
  }, []);

  const logIn = useCallback(async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  }, []);

  const logOut = useCallback(() => signOut(auth), []);

  return { user, authLoaded, signUp, logIn, logOut };
}

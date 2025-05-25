import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import firebase from "@/lib/firebase/firebase";

export default function useFirebaseUser() {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebase.auth, () => {
      setUser(firebase.auth.currentUser);
      setInitializing(false);
    });
    return unsubscribe;
  }, []);

  return { user, initializing };
}

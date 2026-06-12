import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../lib/firebase";
import {
  onAuthStateChanged,
  getRedirectResult,
  type User,
} from "firebase/auth";

type AuthContextType = {
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export const AuthProvider = ({ children }: any) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub: any;

    const initAuth = async () => {
      try {
        // 🔥 STEP 1: resolve Google redirect FIRST
        await getRedirectResult(auth);
      } catch (err) {
        console.log("Redirect result error:", err);
      }

      // 🔥 STEP 2: ONLY THEN attach auth listener
      unsub = onAuthStateChanged(auth, async (u) => {
        if (u) {
          try {
            await u.reload(); // ensure fresh verification state
          } catch (e) {
            console.log("User reload error:", e);
          }
        }

        console.log("AUTH STATE:", u);

        setUser(u);
        setLoading(false);
      });
    };

    initAuth();

    return () => {
      if (unsub) unsub();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
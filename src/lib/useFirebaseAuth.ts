import { useState, useEffect, useMemo } from "react";
import { Capacitor } from "@capacitor/core";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import { onIdTokenChanged, getIdToken, User } from "firebase/auth";
import { auth } from "./firebase";

export default function useFirebaseAuth() {
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // Use Native Auth Plugin directly (bypasses Web CORS/Network issues)
      FirebaseAuthentication.getCurrentUser().then((result) => {
        setUser(result.user || null);
        setIsLoading(false);
      }).catch(() => setIsLoading(false));

      const listener = FirebaseAuthentication.addListener("authStateChange", (change) => {
        setUser(change.user || null);
      });

      return () => {
        listener.then(l => l.remove());
      };
    } else {
      // Use Web SDK for desktop/browser
      return onIdTokenChanged(auth, (u) => {
        setUser(u);
        setIsLoading(false);
      });
    }
  }, []);

  return useMemo(
    () => ({
      isLoading,
      isAuthenticated: user !== null,
      fetchAccessToken: async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
        if (user) {
          try {
            if (Capacitor.isNativePlatform()) {
              const result = await FirebaseAuthentication.getIdToken({ forceRefresh: forceRefreshToken });
              return result.token || null;
            } else {
              // Assumes user is Firebase web User
              return await getIdToken(user as User, forceRefreshToken);
            }
          } catch (e) {
            return null;
          }
        }
        return null;
      },
    }),
    [user, isLoading]
  );
}

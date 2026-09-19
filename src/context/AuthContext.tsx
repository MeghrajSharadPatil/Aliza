import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, CREATOR_PROFILE } from "../types/auth";
import { supabase } from "../supabaseClient.js";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signInWithGoogle: (customAccount?: { name: string; email: string; photoUrl?: string }) => void;
  signInAsCreator: () => void;
  signInWithEmail: (email: string, name: string) => void;
  continueAsGuest: () => void;
  signOut: () => void;
  isSignInModalOpen: boolean;
  openSignInModal: () => void;
  closeSignInModal: () => void;
}

const STORAGE_KEY = "aliza_auth_user_v1";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);

  // Restore user from Supabase session on initial load
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      if (session?.user?.email) {
        const email = session.user.email;
        const name = session.user.user_metadata?.name || email.split("@")[0];
        const isCreator = email.toLowerCase().includes("meghraj") || name.toLowerCase().includes("meghraj");
        saveUser({
          id: session.user.id,
          name,
          email,
          photoUrl: isCreator ? CREATOR_PROFILE.photoUrl : undefined,
          isCreator,
          provider: "email",
          signedInAt: new Date().toISOString(),
        });
      } else {
        saveUser(null);
      }
      setIsLoading(false);
    }).catch((e: any) => {
      console.warn("Failed to check Supabase session", e);
      saveUser(null);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      if (session?.user?.email) {
        const email = session.user.email;
        const name = session.user.user_metadata?.name || email.split("@")[0];
        const isCreator = email.toLowerCase().includes("meghraj") || name.toLowerCase().includes("meghraj");
        saveUser({
          id: session.user.id,
          name,
          email,
          photoUrl: isCreator ? CREATOR_PROFILE.photoUrl : undefined,
          isCreator,
          provider: "email",
          signedInAt: new Date().toISOString(),
        });
      } else {
        saveUser(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const saveUser = (newUser: User | null) => {
    setUser(newUser);
    if (newUser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const signInWithGoogle = async (customAccount?: { name: string; email: string; photoUrl?: string }) => {
    if (customAccount) {
      const email = customAccount.email.trim();
      const name = customAccount.name.trim() || email.split("@")[0];
      const isCreator = email.toLowerCase().includes("meghraj") || name.toLowerCase().includes("meghraj");

      const googleUser: User = {
        id: `google-${Date.now()}`,
        name,
        email,
        photoUrl: customAccount?.photoUrl || (isCreator ? CREATOR_PROFILE.photoUrl : undefined),
        isCreator,
        provider: "google",
        signedInAt: new Date().toISOString(),
      };

      saveUser(googleUser);
      setIsSignInModalOpen(false);
      return;
    }

    // Attempt real Supabase Google OAuth
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) {
        console.warn("Supabase Google OAuth error:", error.message);
      }
    } catch (err) {
      console.warn("Supabase Google OAuth error:", err);
    }
  };

  const signInAsCreator = () => {
    saveUser({
      ...CREATOR_PROFILE,
      signedInAt: new Date().toISOString(),
    });
    setIsSignInModalOpen(false);
  };

  const signInWithEmail = (email: string, name: string) => {
    const isCreator = email.toLowerCase().includes("meghraj") || name.toLowerCase().includes("meghraj");
    const emailUser: User = {
      id: `email-${Date.now()}`,
      name: name.trim() || email.split("@")[0],
      email: email.trim(),
      isCreator,
      provider: "email",
      signedInAt: new Date().toISOString(),
    };

    saveUser(emailUser);
    setIsSignInModalOpen(false);
  };

  const continueAsGuest = () => {
    const guestUser: User = {
      id: `guest-${Math.random().toString(36).substring(2, 8)}`,
      name: "Guest Visitor",
      email: "guest@aliza.ai",
      isCreator: false,
      provider: "guest",
      signedInAt: new Date().toISOString(),
    };

    saveUser(guestUser);
    setIsSignInModalOpen(false);
  };

  const signOut = () => {
    supabase.auth.signOut().catch((err: any) => console.warn("Supabase sign out error:", err));
    saveUser(null);
  };

  const openSignInModal = () => setIsSignInModalOpen(true);
  const closeSignInModal = () => setIsSignInModalOpen(false);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        signInWithGoogle,
        signInAsCreator,
        signInWithEmail,
        continueAsGuest,
        signOut,
        isSignInModalOpen,
        openSignInModal,
        closeSignInModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

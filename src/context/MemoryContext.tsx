import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { UserMemory, ConversationSession, UserHistoryData } from "../types/memory";
import { useAuth } from "./AuthContext";

interface MemoryContextType {
  memories: UserMemory[];
  sessions: ConversationSession[];
  preferredName: string;
  bio: string;
  isHistoryTrackingEnabled: boolean;
  setIsHistoryTrackingEnabled: (enabled: boolean) => void;
  addMemory: (fact: string, category?: UserMemory["category"]) => void;
  removeMemory: (id: string) => void;
  updateProfileDetails: (details: { preferredName?: string; bio?: string }) => void;
  recordSessionEnd: (snippet?: string, durationSeconds?: number) => void;
  clearSessionsOnly: () => void;
  clearAllHistory: () => void;
  isMemoryDrawerOpen: boolean;
  openMemoryDrawer: () => void;
  closeMemoryDrawer: () => void;
}

const MemoryContext = createContext<MemoryContextType | undefined>(undefined);

const DEFAULT_CREATOR_MEMORIES: UserMemory[] = [
  {
    id: "mem-creator-1",
    category: "identity",
    fact: "Creator and architect of Aliza (Meghraj Patil)",
    createdAt: new Date().toISOString(),
  },
  {
    id: "mem-creator-2",
    category: "work",
    fact: "Full-stack engineer working on real-time AI agents and Gemini integrations",
    createdAt: new Date().toISOString(),
  },
  {
    id: "mem-creator-3",
    category: "preference",
    fact: "Loves sassy, sharp banter and teasing humor instead of boring robotic answers",
    createdAt: new Date().toISOString(),
  },
];

export function MemoryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [memories, setMemories] = useState<UserMemory[]>([]);
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [preferredName, setPreferredName] = useState<string>("");
  const [bio, setBio] = useState<string>("");
  const [isMemoryDrawerOpen, setIsMemoryDrawerOpen] = useState<boolean>(false);
  const [isHistoryTrackingEnabled, setIsHistoryTrackingEnabled] = useState<boolean>(true);

  // Derive unique storage key based on user
  const userKey = user?.email || (user?.id ? `user_${user.id}` : "guest_user");
  const storageKey = `aliza_history_v2_${userKey}`;

  // Load history & memories from storage or server
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const data: UserHistoryData = JSON.parse(stored);
        setMemories(data.memories || []);
        setSessions(data.sessions || []);
        setPreferredName(data.preferredName || user?.name || "");
        setBio(data.bio || "");
      } else {
        // Initial defaults for user
        const initialMemories = user?.isCreator ? [...DEFAULT_CREATOR_MEMORIES] : [];
        setMemories(initialMemories);
        setSessions([]);
        setPreferredName(user?.name || "");
        setBio(user?.isCreator ? "Master Architect of Aliza" : "");

        const initialData: UserHistoryData = {
          userEmail: user?.email || "guest@local",
          userName: user?.name || "Guest User",
          preferredName: user?.name || "",
          bio: user?.isCreator ? "Master Architect of Aliza" : "",
          memories: initialMemories,
          sessions: [],
        };
        localStorage.setItem(storageKey, JSON.stringify(initialData));
      }
    } catch (e) {
      console.warn("[Memory] Failed to load local memory:", e);
    }
  }, [userKey, user?.name, user?.isCreator]);

  // Helper to persist current state
  const persistState = useCallback(
    (newMemories: UserMemory[], newSessions: ConversationSession[], newName: string, newBio: string) => {
      const data: UserHistoryData = {
        userEmail: user?.email || "guest@local",
        userName: user?.name || newName || "User",
        preferredName: newName,
        bio: newBio,
        memories: newMemories,
        sessions: newSessions,
      };
      try {
        localStorage.setItem(storageKey, JSON.stringify(data));
      } catch (e) {
        console.warn("[Memory] Error saving local memory:", e);
      }
    },
    [storageKey, user?.email, user?.name]
  );

  const addMemory = useCallback(
    (fact: string, category: UserMemory["category"] = "fact") => {
      if (!fact || !fact.trim()) return;
      const cleanFact = fact.trim();
      
      setMemories((prev) => {
        // Avoid duplicate facts
        if (prev.some((m) => m.fact.toLowerCase() === cleanFact.toLowerCase())) {
          return prev;
        }
        const newMemory: UserMemory = {
          id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          category,
          fact: cleanFact,
          createdAt: new Date().toISOString(),
        };
        const updated = [newMemory, ...prev];
        persistState(updated, sessions, preferredName, bio);
        return updated;
      });
    },
    [sessions, preferredName, bio, persistState]
  );

  const removeMemory = useCallback(
    (id: string) => {
      setMemories((prev) => {
        const updated = prev.filter((m) => m.id !== id);
        persistState(updated, sessions, preferredName, bio);
        return updated;
      });
    },
    [sessions, preferredName, bio, persistState]
  );

  const updateProfileDetails = useCallback(
    (details: { preferredName?: string; bio?: string }) => {
      const updatedName = details.preferredName !== undefined ? details.preferredName : preferredName;
      const updatedBio = details.bio !== undefined ? details.bio : bio;
      setPreferredName(updatedName);
      setBio(updatedBio);
      persistState(memories, sessions, updatedName, updatedBio);
    },
    [memories, sessions, preferredName, bio, persistState]
  );

  const recordSessionEnd = useCallback(
    (snippet?: string, durationSeconds?: number) => {
      // If history tracking is disabled by the user, do not record sessions
      if (!isHistoryTrackingEnabled) return;

      const newSession: ConversationSession = {
        id: `sess-${Date.now()}`,
        startedAt: new Date(Date.now() - (durationSeconds || 10) * 1000).toISOString(),
        endedAt: new Date().toISOString(),
        durationSeconds: durationSeconds || 15,
        snippet: snippet ? snippet.slice(0, 120) : "Voice interaction with Aliza",
      };

      setSessions((prev) => {
        // Cap to only the 5 most recent sessions to keep local device storage tiny
        const updated = [newSession, ...prev.slice(0, 4)];
        persistState(memories, updated, preferredName, bio);
        return updated;
      });
    },
    [isHistoryTrackingEnabled, memories, preferredName, bio, persistState]
  );

  const clearSessionsOnly = useCallback(() => {
    setSessions([]);
    persistState(memories, [], preferredName, bio);
  }, [memories, preferredName, bio, persistState]);

  const clearAllHistory = useCallback(() => {
    setMemories([]);
    setSessions([]);
    persistState([], [], preferredName, bio);
  }, [preferredName, bio, persistState]);

  return (
    <MemoryContext.Provider
      value={{
        memories,
        sessions,
        preferredName,
        bio,
        isHistoryTrackingEnabled,
        setIsHistoryTrackingEnabled,
        addMemory,
        removeMemory,
        updateProfileDetails,
        recordSessionEnd,
        clearSessionsOnly,
        clearAllHistory,
        isMemoryDrawerOpen,
        openMemoryDrawer: () => setIsMemoryDrawerOpen(true),
        closeMemoryDrawer: () => setIsMemoryDrawerOpen(false),
      }}
    >
      {children}
    </MemoryContext.Provider>
  );
}

export function useMemory() {
  const context = useContext(MemoryContext);
  if (!context) {
    throw new Error("useMemory must be used within a MemoryProvider");
  }
  return context;
}

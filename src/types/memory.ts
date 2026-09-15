export interface UserMemory {
  id: string;
  category: "preference" | "identity" | "work" | "personal" | "hobby" | "fact";
  fact: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ConversationSession {
  id: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;
  snippet?: string;
  keyTopics?: string[];
}

export interface UserHistoryData {
  userEmail: string;
  userName: string;
  preferredName?: string;
  bio?: string;
  memories: UserMemory[];
  sessions: ConversationSession[];
}

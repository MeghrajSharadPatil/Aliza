export interface User {
  id: string;
  name: string;
  email: string;
  photoUrl?: string;
  isCreator: boolean;
  provider: "google" | "email" | "guest";
  signedInAt: string;
}

export const CREATOR_PROFILE: User = {
  id: "creator-meghraj-patil",
  name: "Meghraj Patil",
  email: "meghrajpatil1313@gmail.com",
  photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  isCreator: true,
  provider: "google",
  signedInAt: new Date().toISOString(),
};

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useMemory } from "../context/MemoryContext";
import { useAuth } from "../context/AuthContext";
import {
  Brain,
  X,
  Plus,
  Trash2,
  Clock,
  User,
  Sparkles,
  History,
  Tag,
  Check,
  Save,
  AlertCircle,
} from "lucide-react";
import { UserMemory } from "../types/memory";

interface MemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MemoryModal: React.FC<MemoryModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const {
    memories,
    sessions,
    preferredName,
    bio,
    isHistoryTrackingEnabled,
    setIsHistoryTrackingEnabled,
    addMemory,
    removeMemory,
    updateProfileDetails,
    clearSessionsOnly,
    clearAllHistory,
  } = useMemory();

  const [activeTab, setActiveTab] = useState<"memories" | "history">("memories");
  const [newFact, setNewFact] = useState("");
  const [newCategory, setNewCategory] = useState<UserMemory["category"]>("preference");
  const [editName, setEditName] = useState(preferredName || user?.name || "");
  const [editBio, setEditBio] = useState(bio || "");
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync edits when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setEditName(preferredName || user?.name || "");
      setEditBio(bio || "");
    }
  }, [isOpen, preferredName, user?.name, bio]);

  if (!isOpen) return null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileDetails({ preferredName: editName, bio: editBio });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleAddMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFact.trim()) return;
    addMemory(newFact.trim(), newCategory);
    setNewFact("");
  };

  const getCategoryColor = (cat: UserMemory["category"]) => {
    switch (cat) {
      case "identity":
        return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      case "work":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      case "preference":
        return "bg-pink-500/10 text-pink-400 border-pink-500/30";
      case "hobby":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "personal":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      default:
        return "bg-zinc-800 text-zinc-300 border-zinc-700";
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-xl bg-zinc-950/95 border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-zinc-200"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-zinc-900/50">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-pink-500/15 border border-pink-500/30 text-pink-400">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
                  <span>Aliza's User Memory & History</span>
                  <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Information Aliza remembers and brings up in your voice conversations
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-white/10 px-6 bg-zinc-900/20">
            <button
              onClick={() => setActiveTab("memories")}
              className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider flex items-center space-x-2 border-b-2 transition-colors cursor-pointer ${
                activeTab === "memories"
                  ? "border-pink-500 text-white"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Details & Memory ({memories.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider flex items-center space-x-2 border-b-2 transition-colors cursor-pointer ${
                activeTab === "history"
                  ? "border-pink-500 text-white"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Voice Session History ({sessions.length})</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
            {activeTab === "memories" ? (
              <>
                {/* Profile Details (Name & Bio) */}
                <form
                  onSubmit={handleSaveProfile}
                  className="p-4 rounded-xl bg-zinc-900/70 border border-white/5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
                      Identity & Preferred Name
                    </span>
                    {savedSuccess && (
                      <span className="text-[10px] text-emerald-400 flex items-center space-x-1 font-mono">
                        <Check className="w-3 h-3" />
                        <span>SAVED</span>
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-zinc-400 mb-1">
                        What should Aliza call you?
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="e.g. Meghraj, Max, Boss"
                        className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-pink-500 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-400 mb-1">
                        Your role or bio
                      </label>
                      <input
                        type="text"
                        value={editBio}
                        onChange={(e) => setEditBio(e.target.value)}
                        placeholder="e.g. Software Engineer, Creator"
                        className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-pink-500 text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 text-xs font-medium flex items-center space-x-1.5 transition-all cursor-pointer"
                    >
                      <Save className="w-3 h-3" />
                      <span>Update Name & Bio</span>
                    </button>
                  </div>
                </form>

                {/* Add New Memory / Fact */}
                <form
                  onSubmit={handleAddMemory}
                  className="p-4 rounded-xl bg-zinc-900/70 border border-white/5 space-y-3"
                >
                  <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wider block">
                    Teach Aliza a New Detail
                  </span>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={newFact}
                      onChange={(e) => setNewFact(e.target.value)}
                      placeholder="e.g. I love dark roast coffee, My birthday is in May..."
                      className="flex-1 px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-pink-500 text-xs"
                    />
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as any)}
                      className="px-2.5 py-2 rounded-lg bg-black/50 border border-white/10 text-zinc-300 text-xs focus:outline-none focus:border-pink-500"
                    >
                      <option value="preference">Preference</option>
                      <option value="work">Work</option>
                      <option value="hobby">Hobby</option>
                      <option value="identity">Identity</option>
                      <option value="personal">Personal</option>
                      <option value="fact">General Fact</option>
                    </select>
                    <button
                      type="submit"
                      disabled={!newFact.trim()}
                      className="px-4 py-2 rounded-lg bg-pink-600 hover:bg-pink-500 disabled:opacity-40 text-white font-medium text-xs flex items-center justify-center space-x-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Remember</span>
                    </button>
                  </div>
                </form>

                {/* List of Stored Memories */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>What Aliza currently remembers about you:</span>
                    <span>{memories.length} item{memories.length !== 1 ? "s" : ""}</span>
                  </div>

                  {memories.length === 0 ? (
                    <div className="p-8 text-center rounded-xl border border-dashed border-white/10 text-zinc-500">
                      <Brain className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p>No memories saved yet.</p>
                      <p className="text-[10px] mt-1 text-zinc-600">
                        Tell Aliza details while speaking, or add one above!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {memories.map((mem) => (
                        <div
                          key={mem.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors group"
                        >
                          <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider border shrink-0 ${getCategoryColor(
                                mem.category
                              )}`}
                            >
                              {mem.category}
                            </span>
                            <span className="text-zinc-200 truncate">{mem.fact}</span>
                          </div>

                          <button
                            onClick={() => removeMemory(mem.id)}
                            className="text-zinc-600 hover:text-red-400 p-1 rounded transition-colors opacity-60 group-hover:opacity-100 cursor-pointer shrink-0"
                            title="Forget detail"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Session History View */
              <div className="space-y-4">
                {/* Supabase Free Tier Guarantee Banner */}
                <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 flex items-start space-x-2.5">
                  <span className="p-1 rounded-md bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                  <div className="space-y-0.5">
                    <h5 className="text-[11px] font-bold text-emerald-300 font-mono tracking-wide uppercase">
                      Supabase Free-Tier Safe
                    </h5>
                    <p className="text-[10px] text-zinc-400 leading-relaxed">
                      Supabase is strictly used for authentication. <strong>Zero conversation history, search queries, or audio files</strong> are written to Supabase database tables, consuming 0 KB of your Supabase storage quota.
                    </p>
                  </div>
                </div>

                {/* Session tracking toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5">
                  <div className="space-y-0.5">
                    <div className="text-xs text-zinc-200 font-medium">Record Recent Voice Calls</div>
                    <div className="text-[10px] text-zinc-500">
                      Kept locally on device only (capped to 5 latest calls)
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsHistoryTrackingEnabled(!isHistoryTrackingEnabled)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isHistoryTrackingEnabled ? "bg-pink-600" : "bg-zinc-800"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        isHistoryTrackingEnabled ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
                  <span>Recent call timestamps ({sessions.length}/5):</span>
                  {sessions.length > 0 && (
                    <button
                      onClick={clearSessionsOnly}
                      className="text-red-400 hover:text-red-300 text-[10px] flex items-center space-x-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear Call Logs</span>
                    </button>
                  )}
                </div>

                {sessions.length === 0 ? (
                  <div className="p-8 text-center rounded-xl border border-dashed border-white/10 text-zinc-500">
                    <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>No voice session history recorded.</p>
                    <p className="text-[10px] mt-1 text-zinc-600">
                      {isHistoryTrackingEnabled
                        ? "Calls are kept purely in local memory."
                        : "Call logging is currently disabled."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {sessions.map((sess) => (
                      <div
                        key={sess.id}
                        className="p-3.5 rounded-lg bg-white/[0.03] border border-white/5 space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                          <span className="flex items-center space-x-1.5">
                            <Clock className="w-3 h-3 text-pink-400" />
                            <span>{new Date(sess.startedAt).toLocaleString()}</span>
                          </span>
                          <span className="text-zinc-500">
                            Duration: {sess.durationSeconds || 15}s
                          </span>
                        </div>
                        <p className="text-zinc-300 text-[11px] italic">
                          "{sess.snippet}"
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 border-t border-white/10 bg-zinc-900/40 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
            <span className="flex items-center space-x-1.5">
              <Sparkles className="w-3 h-3 text-pink-400" />
              <span>Context is transmitted directly to Gemini Live</span>
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-zinc-200 text-xs font-medium transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LogOut, User, Sparkles, ChevronDown, CheckCircle2, ShieldAlert, Brain } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useMemory } from "../context/MemoryContext";
import { GoogleSvgIcon } from "./SignInModal";

export function UserAccountBar() {
  const { user, openSignInModal, signOut } = useAuth();
  const { openMemoryDrawer, memories } = useMemory();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) {
    return (
      <button
        onClick={openSignInModal}
        className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-pink-500/40 text-xs text-zinc-200 transition-all cursor-pointer group shadow-sm"
      >
        <GoogleSvgIcon className="w-3.5 h-3.5" />
        <span className="font-semibold tracking-wider text-[11px] group-hover:text-white">Sign In</span>
      </button>
    );
  }

  // Get initials for fallback avatar
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 py-1 px-2.5 rounded-full border transition-all cursor-pointer ${
          user.isCreator
            ? "bg-pink-950/30 border-pink-500/40 hover:border-pink-400/80 shadow-[0_0_12px_rgba(244,63,94,0.15)]"
            : "bg-zinc-900/80 border-white/10 hover:border-white/20"
        }`}
      >
        {/* User avatar or photo */}
        <div className="relative w-5 h-5 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
          {user.photoUrl ? (
            <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span>{initials}</span>
          )}
        </div>

        {/* User Name */}
        <span className="text-[11px] font-medium text-zinc-200 truncate max-w-[110px]">
          {user.name}
        </span>

        {/* Creator Pill Badge */}
        {user.isCreator && (
          <span className="px-1.5 py-0.2 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[8px] font-mono font-black uppercase tracking-wider rounded-sm shadow-xs">
            CREATOR
          </span>
        )}

        <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Account Dropdown Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-64 rounded-xl bg-[#0e0e13] border border-white/10 shadow-2xl p-4 z-50 space-y-3.5"
          >
            {/* Header info */}
            <div className="flex items-center space-x-3 pb-3 border-b border-white/5">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 border border-white/10 flex items-center justify-center text-sm font-bold text-white shrink-0">
                {user.photoUrl ? (
                  <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div className="overflow-hidden">
                <div className="flex items-center space-x-1.5">
                  <h4 className="text-xs font-semibold text-white truncate">{user.name}</h4>
                </div>
                <p className="text-[10px] text-zinc-400 font-mono truncate">{user.email}</p>
                <div className="flex items-center space-x-1 mt-1">
                  {user.provider === "google" ? (
                    <span className="text-[9px] text-zinc-400 flex items-center space-x-1">
                      <GoogleSvgIcon className="w-2.5 h-2.5 inline" />
                      <span>Google Account</span>
                    </span>
                  ) : (
                    <span className="text-[9px] text-zinc-400 uppercase font-mono">{user.provider}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Creator badge description */}
            {user.isCreator && (
              <div className="p-2.5 rounded-lg bg-pink-950/40 border border-pink-500/25 space-y-1">
                <div className="flex items-center space-x-1.5 text-pink-400 text-[10px] font-mono font-bold uppercase">
                  <Sparkles className="w-3 h-3" />
                  <span>Master Architect Status</span>
                </div>
                <p className="text-[10px] text-zinc-300 leading-tight">
                  Aliza recognizes you as her creator! Voice responses are tailored specifically for you.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-1.5 pt-1 font-sans">
              <button
                onClick={() => {
                  setIsOpen(false);
                  openMemoryDrawer();
                }}
                className="w-full py-2 px-3 text-left rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-white/5 flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="flex items-center space-x-2">
                  <Brain className="w-3.5 h-3.5 text-pink-400" />
                  <span>Memory & History</span>
                </span>
                <span className="text-[10px] text-pink-400/80 font-mono bg-pink-500/10 px-1.5 py-0.5 rounded border border-pink-500/20">
                  {memories.length} saved
                </span>
              </button>

              <button
                onClick={() => {
                  setIsOpen(false);
                  openSignInModal();
                }}
                className="w-full py-2 px-3 text-left rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-white/5 flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>Switch / Re-authenticate</span>
                <GoogleSvgIcon className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => {
                  setIsOpen(false);
                  signOut();
                }}
                className="w-full py-2 px-3 text-left rounded-lg text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>Sign Out</span>
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

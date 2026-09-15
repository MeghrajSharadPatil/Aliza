import React, { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MemoryCallEvent } from "../hooks/useLiveSession";
import { Brain, Sparkles, X, Check } from "lucide-react";

interface MemoryBannerProps {
  event: MemoryCallEvent | null;
  onDismiss: () => void;
}

export const MemoryBanner: React.FC<MemoryBannerProps> = ({ event, onDismiss }) => {
  useEffect(() => {
    if (!event) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 5000);
    return () => clearTimeout(timer);
  }, [event, onDismiss]);

  if (!event) return null;

  return (
    <AnimatePresence>
      <motion.div
        id="memory-banner-container"
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -15, scale: 0.95 }}
        className="relative z-50 w-full max-w-sm mx-auto overflow-hidden bg-zinc-950/95 border border-pink-500/50 rounded-2xl shadow-[0_0_35px_rgba(244,63,94,0.3)] backdrop-blur-xl p-4 font-sans mb-3"
      >
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-pink-500 via-rose-400 to-indigo-500" />
        
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-pink-500/15 border border-pink-500/30 text-pink-400 shrink-0">
              <Brain className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-1">
                <span className="text-[9px] font-mono tracking-widest text-pink-400 uppercase">Memory Stored</span>
                <Sparkles className="w-3 h-3 text-pink-400" />
              </div>
              <h4 className="text-xs font-semibold text-zinc-100 tracking-tight mt-0.5">
                Aliza remembered something!
              </h4>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-2.5 p-2 rounded-lg bg-white/[0.04] border border-white/5 flex items-center justify-between text-xs text-zinc-300">
          <span className="truncate italic">"{event.fact}"</span>
          <span className="flex items-center space-x-1 text-[10px] text-emerald-400 font-mono shrink-0 ml-2">
            <Check className="w-3 h-3" />
            <span>SAVED</span>
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

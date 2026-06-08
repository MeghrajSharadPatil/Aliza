import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ToolCallEvent } from "../hooks/useLiveSession";
import { ExternalLink, Sparkles, X, Globe } from "lucide-react";

interface ToolBannerProps {
  event: ToolCallEvent | null;
  onDismiss: () => void;
}

export const ToolBanner: React.FC<ToolBannerProps> = ({ event, onDismiss }) => {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!event) return;
    setCountdown(5);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [event]);

  if (!event) return null;

  return (
    <AnimatePresence>
      <motion.div
        id="tool-banner-container"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        className="relative z-50 w-full max-w-sm mx-auto overflow-hidden bg-zinc-950/90 border border-fuchsia-500/50 rounded-2xl shadow-[0_0_30px_rgba(236,72,153,0.25)] backdrop-blur-xl p-5 font-sans"
      >
        {/* Particle and laser header grids */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-500" />
        
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400">
              <Globe className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-1">
                <span className="text-[9px] font-mono tracking-widest text-fuchsia-400 uppercase">System Directive</span>
                <Sparkles className="w-3 h-3 text-fuchsia-400" />
              </div>
              <h4 className="text-sm font-semibold text-zinc-100 tracking-tight">
                Aliza opened a Portal
              </h4>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="p-1 rounded-full text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-2 text-zinc-300">
          <p className="text-xs leading-relaxed">
            Aliza parsed your instruction and triggered an instant client browser tunnel to load:
          </p>
          <div className="flex flex-col p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800 font-mono text-xs overflow-hidden">
            <span className="text-fuchsia-300 font-semibold truncate leading-none">
              {event.siteName}
            </span>
            <span className="text-[10px] text-zinc-500 truncate mt-1">
              {event.url}
            </span>
          </div>
        </div>

        {/* Dynamic portal countdown progress bar */}
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
            <span>PORTAL REDIRECT SECRECILLATOR</span>
            <span>{countdown > 0 ? `00:0${countdown}` : "REDIRECT_ACTIVE"}</span>
          </div>
          <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 5, ease: "linear" }}
              className="h-full bg-gradient-to-r from-fuchsia-500 to-indigo-500"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center space-x-2">
          <a
            href={event.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onDismiss}
            className="flex-1 inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white font-medium text-xs shadow-md shadow-fuchsia-600/30 transition-all cursor-pointer"
          >
            <span>Jump Directly</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={onDismiss}
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-300 text-xs font-semibold scroll-py-2 transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

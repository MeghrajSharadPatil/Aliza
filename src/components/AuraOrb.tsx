import React from "react";
import { motion } from "motion/react";
import { SessionState } from "../hooks/useLiveSession";
import { Mic, MicOff, Wifi, AlertTriangle } from "lucide-react";

interface AuraOrbProps {
  state: SessionState;
  userVolume: number;
  alizaVolume: number;
  onToggle: () => void;
}

export const AuraOrb: React.FC<AuraOrbProps> = ({
  state,
  userVolume,
  alizaVolume,
  onToggle,
}) => {
  // Compute size scales based on states and audio feeds
  const volumeMultiplier = state === "speaking" ? alizaVolume : state === "listening" ? userVolume : 0;
  const baseScale = 1 + volumeMultiplier * 0.95;

  // State-dependent sophisticated theme configurations
  const getOrbTheme = () => {
    switch (state) {
      case "disconnected":
        return {
          glow: "from-zinc-900/50 via-zinc-950/80 to-[#050505]",
          core: "bg-gradient-to-tr from-zinc-800 to-zinc-900 border-zinc-700/60 shadow-[0_0_30px_rgba(255,255,255,0.03)]",
          halo: "border-white/[0.03]",
          text: "text-zinc-500",
          statusColor: "bg-zinc-700",
          borderColor: "border-white/[0.08]",
        };
      case "connecting":
        return {
          glow: "from-indigo-600/25 via-pink-900/15 to-[#050505]",
          core: "bg-gradient-to-tr from-indigo-600 to-pink-500 shadow-[0_0_80px_rgba(168,85,247,0.3)]",
          halo: "border-indigo-500/20",
          text: "text-indigo-400",
          statusColor: "bg-indigo-400 animate-pulse",
          borderColor: "border-indigo-500/35",
        };
      case "listening":
        return {
          glow: "from-pink-500/20 via-indigo-950/20 to-[#050505]",
          core: "bg-gradient-to-tr from-pink-500/80 to-indigo-600 shadow-[0_0_90px_rgba(236,72,153,0.35)]",
          halo: "border-pink-500/25",
          text: "text-pink-400",
          statusColor: "bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.9)]",
          borderColor: "border-pink-500/50",
        };
      case "speaking":
        return {
          glow: "from-pink-500/30 via-indigo-900/30 to-[#050505]",
          core: "bg-gradient-to-tr from-pink-600 to-indigo-600 shadow-[0_0_100px_rgba(236,72,153,0.45)]",
          halo: "border-pink-500/40",
          text: "text-pink-300",
          statusColor: "bg-pink-400 shadow-[0_0_10px_rgba(236,72,153,1)]",
          borderColor: "border-pink-400/60",
        };
      case "error":
        return {
          glow: "from-red-900/30 via-zinc-950/80 to-[#050505]",
          core: "bg-gradient-to-tr from-red-600 to-zinc-900 shadow-[0_0_50px_rgba(239,68,68,0.3)]",
          halo: "border-red-500/15",
          text: "text-red-400",
          statusColor: "bg-red-500",
          borderColor: "border-red-500/30",
        };
    }
  };

  const theme = getOrbTheme();

  return (
    <div id="aura-orb-container" className="relative flex flex-col items-center justify-center p-8 select-none">
      
      {/* 450px Deep Contrast Ring */}
      <div className="absolute w-[450px] h-[450px] border border-white/[0.02] rounded-full pointer-events-none" />
      
      {/* 350px Velvet Halo */}
      <div className="absolute w-[350px] h-[350px] border border-white/[0.04] rounded-full pointer-events-none" />
      
      {/* 250px Interactive Glowing Indicator */}
      <div className={`absolute w-[250px] h-[250px] border border-pink-500/5 rounded-full pointer-events-none ${state !== "disconnected" ? "border-pink-500/10" : ""}`} />

      {/* Dynamic Ambient Background Glow */}
      <div
        className={`absolute inset-0 max-w-lg mx-auto rounded-full bg-gradient-to-b ${theme.glow} blur-3xl opacity-75 transition-all duration-1000 -z-10`}
        style={{ transform: `scale(${baseScale * 1.2})` }}
      />

      {/* Spinning Outer Orbit Ring (Active on connection setup) */}
      {state === "connecting" && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
          className="absolute w-[320px] h-[320px] rounded-full border border-dashed border-pink-500/30 pointer-events-none"
        />
      )}

      {/* Primary Kinetic Flare Ring */}
      <motion.div
        animate={
          state !== "disconnected"
            ? { scale: [1, 1.08, 1], opacity: [0.3, 0.5, 0.3] }
            : { scale: 1, opacity: 0.15 }
        }
        transition={{
          repeat: Infinity,
          duration: 3.2,
          ease: "easeInOut",
        }}
        className={`absolute w-[240px] h-[240px] rounded-full border ${theme.halo} -z-1 pointer-events-none`}
        style={{ transform: `scale(${baseScale})` }}
      />

      {/* Main Interactive Tactile Orb Trigger */}
      <motion.button
        id="central-power-orb"
        onClick={onToggle}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        animate={
          state === "speaking" || state === "listening"
            ? { scale: [1, 1.025, 1] }
            : { scale: 1 }
        }
        transition={
          state === "speaking" || state === "listening"
            ? {
                repeat: Infinity,
                duration: 2.2,
                ease: "easeInOut",
              }
            : {
                type: "spring",
                stiffness: 180,
              }
        }
        style={{ scale: baseScale }}
        className={`relative z-10 w-44 h-44 rounded-full flex flex-col items-center justify-center border-2 ${theme.borderColor} ${theme.core} transition-colors duration-700 cursor-pointer outline-none focus:outline-none`}
      >
        {/* Dynamic High-Contrast Spotlight Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.18),transparent_60%)] pointer-events-none" />

        {/* Sophisticated inner white/pink hot glow dot (active when speaking) */}
        {state === "speaking" && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: [0.8, 1.0, 0.8], scale: [0.95, 1.05, 0.95] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="absolute w-12 h-12 bg-white rounded-full shadow-[0_0_35px_rgba(255,255,255,0.95)] opacity-95 pointer-events-none" 
          />
        )}

        {/* Display Icon and Status Codes */}
        <div className="relative z-20 flex flex-col items-center justify-center text-white space-y-2">
          {state === "disconnected" && (
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
              <MicOff className="w-8 h-8 text-white/50" />
            </motion.div>
          )}
          {state === "connecting" && (
            <motion.div
              animate={{ y: [-3, 3, -3] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            >
              <Wifi className="w-8 h-8 text-white/80" />
            </motion.div>
          )}
          {state === "listening" && (
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
              <Mic className="w-8 h-8 text-white" />
            </motion.div>
          )}
          {state === "speaking" && (
            <div className="relative flex items-center justify-center">
              <Mic className="w-8 h-8 text-pink-600 fill-pink-600" />
            </div>
          )}
          {state === "error" && (
            <motion.div animate={{ rotate: [0, -8, 8, -8, 0] }} transition={{ duration: 0.5 }}>
              <AlertTriangle className="w-8 h-8 text-rose-300" />
            </motion.div>
          )}

          {/* Simple design action tag */}
          <span className="text-[9px] font-mono tracking-[0.25em] font-bold text-white/80 uppercase">
            {state === "disconnected" && "START"}
            {state === "connecting" && "INIT..."}
            {state === "listening" && "LISTEN"}
            {state === "speaking" && "SPEAKING"}
            {state === "error" && "RELOAD"}
          </span>
        </div>
      </motion.button>
    </div>
  );
};

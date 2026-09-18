import { useState, useEffect, useRef, FormEvent } from "react";
import { useLiveSession } from "./hooks/useLiveSession";
import { AuraOrb } from "./components/AuraOrb";
import { VoiceWaveform } from "./components/VoiceWaveform";
import { ToolBanner } from "./components/ToolBanner";
import { MemoryBanner } from "./components/MemoryBanner";
import { MemoryModal } from "./components/MemoryModal";
import { SassyQuotes } from "./components/SassyQuotes";
import { UserAccountBar } from "./components/UserAccountBar";
import { SignInModal } from "./components/SignInModal";
import { useAuth } from "./context/AuthContext";
import { useMemory } from "./context/MemoryContext";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Volume2,
  HelpCircle,
  Shield,
  Compass,
  RefreshCw,
  Info,
  Settings,
  PhoneOff,
  Phone,
  CheckCircle,
  X,
  Lock,
  User as UserIcon,
  LogIn,
  Brain,
  Send,
} from "lucide-react";

export default function App() {
  const {
    state,
    errorState,
    transcription,
    userVolume,
    alizaVolume,
    hasMicHardware,
    toolCallEvent,
    memoryEvent,
    connect,
    disconnect,
    sendText,
    dismissToolCall,
    dismissMemoryEvent,
    micAnalyser,
    speakerAnalyser,
  } = useLiveSession();

  const { user, openSignInModal } = useAuth();
  const {
    memories,
    preferredName,
    addMemory,
    recordSessionEnd,
    isMemoryDrawerOpen,
    openMemoryDrawer,
    closeMemoryDrawer,
  } = useMemory();

  // Dynamic system digital clock
  const [currentTime, setCurrentTime] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [healthStatus, setHealthStatus] = useState<{
    healthy: boolean;
    keyConfigured: boolean;
    serverReachable: boolean;
  } | null>(null);
  const sessionStartRef = useRef<number>(0);

  const handleSendChat = (e?: FormEvent) => {
    if (e) e.preventDefault();
    const textToSend = chatInput.trim();
    if (!textToSend) return;
    if (state === "disconnected" || state === "error") {
      sessionStartRef.current = Date.now();
      connect({
        user,
        preferredName,
        memories,
        onRememberFact: (fact, category) => {
          addMemory(fact, (category as any) || "fact");
        },
      }).then(() => {
        setTimeout(() => {
          sendText(textToSend);
          setChatInput("");
        }, 1200);
      });
    } else {
      sendText(textToSend);
      setChatInput("");
    }
  };

  useEffect(() => {
    fetch("/api/health")
      .then(async (res) => {
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        setHealthStatus({
          healthy: data.status === "healthy",
          keyConfigured: !!data.geminiKeyConfigured,
          serverReachable: true,
        });
      })
      .catch(() => {
        setHealthStatus({ healthy: false, keyConfigured: false, serverReachable: false });
      });
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12; // true 12 hour cycle
      setCurrentTime(`${hours}:${minutes} ${ampm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleSession = async () => {
    if (state === "disconnected" || state === "error") {
      sessionStartRef.current = Date.now();
      await connect({
        user,
        preferredName,
        memories,
        onRememberFact: (fact, category) => {
          addMemory(fact, (category as any) || "fact");
        },
      });
    } else {
      const durationSeconds = Math.max(1, Math.round((Date.now() - sessionStartRef.current) / 1000));
      disconnect();
      recordSessionEnd(transcription || "Voice session with Aliza", durationSeconds);
    }
  };

  // Determine dynamic slider bar width based on voice capture amplitude or current state
  const getProgressWidth = () => {
    if (state === "speaking") {
      return `${Math.min(100, 30 + alizaVolume * 150)}%`;
    }
    if (state === "listening") {
      return `${Math.min(100, 20 + userVolume * 120)}%`;
    }
    if (state === "connecting") {
      return "45%";
    }
    return "12%";
  };

  return (
    <div
      id="aliza-app-viewport"
      className="relative min-h-screen w-full flex flex-col justify-between bg-[#050505] text-[#F5F5F7] font-sans overflow-hidden md:border-8 border-[#111111] select-none"
    >
      {/* Absolute Glow Spotlights */}
      <div className="absolute top-0 inset-x-0 w-full h-[360px] bg-gradient-to-b from-pink-950/15 via-indigo-950/5 to-transparent blur-[140px] pointer-events-none" />

      {/* Top Sophisticated Telemetry Ribbon with Google Sign-in / User Bar */}
      <div className="px-6 md:px-10 py-4 flex justify-between items-center text-[10px] tracking-[0.2em] font-mono font-medium border-b border-white/[0.04] relative z-20">
        <div className="flex items-center space-x-2 text-white/50">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
          <span className="hidden sm:inline">REAL-TIME STREAM • GEMINI-3.8-LIVE</span>
          <span className="sm:hidden">LIVE AUDIO</span>
        </div>
        <div className="flex items-center space-x-3">
          <div className="hidden md:block text-white/40">{currentTime || "10:41 AM"}</div>

          {/* Memory & History Button */}
          <button
            onClick={openMemoryDrawer}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-pink-500/40 text-xs text-zinc-300 transition-all cursor-pointer group shadow-sm"
            title="Aliza's User Memory & Voice History"
          >
            <Brain className="w-3.5 h-3.5 text-pink-400 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline font-mono text-[10px] tracking-wider uppercase text-zinc-300 group-hover:text-white">
              Memory
            </span>
            {memories.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-pink-500/20 text-pink-300 text-[9px] font-mono border border-pink-500/30">
                {memories.length}
              </span>
            )}
          </button>

          <UserAccountBar />
        </div>
      </div>

      {/* Middle Interactive Column Section */}
      <div className="flex-grow flex flex-col items-center justify-between py-10 px-6 max-w-2xl mx-auto w-full space-y-8">
        
        {/* Dynamic State Badges and Typography Header Block */}
        <div className="flex flex-col items-center text-center space-y-4">
          <AnimatePresence mode="wait">
            {state === "disconnected" && (
              <motion.div
                key="badge-standby"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="px-4 py-1 bg-zinc-900/60 border border-zinc-800 text-[9px] tracking-[0.25em] uppercase font-bold text-zinc-400"
              >
                SYSTEM STANDBY // ALIZA OFFLINE
              </motion.div>
            )}
            {state === "connecting" && (
              <motion.div
                key="badge-connecting"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 0.8, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="px-4 py-1.5 bg-gradient-to-r from-indigo-500/15 to-transparent border-l-2 border-indigo-400 text-[9px] tracking-[0.25em] uppercase font-bold text-indigo-400"
              >
                ESTABLISHING SECURE VOICE FREQUENCIES...
              </motion.div>
            )}
            {state === "listening" && (
              <motion.div
                key="badge-listening"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="px-4 py-1.5 bg-gradient-to-r from-cyan-500/10 to-transparent border-l-2 border-cyan-400 text-[10px] tracking-[0.2em] uppercase font-bold text-cyan-400"
              >
                Awaiting Audio Input
              </motion.div>
            )}
            {state === "speaking" && (
              <motion.div
                key="badge-speaking"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="px-4 py-1.5 bg-gradient-to-r from-pink-500/15 to-transparent border-l-2 border-pink-500 text-[10px] tracking-[0.2em] uppercase font-bold text-pink-500"
              >
                Voice Session Active
              </motion.div>
            )}
            {state === "error" && (
              <motion.div
                key="badge-error"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="px-4 py-1.5 bg-red-950/40 border border-red-500/30 text-[10px] tracking-[0.2em] uppercase font-bold text-red-500"
              >
                CONNECTION REJECTED
              </motion.div>
            )}
          </AnimatePresence>

          <h2 className="text-6xl md:text-7xl font-sans font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40">
            ALIZA
          </h2>

          <div className="min-h-[50px] flex items-center justify-center max-w-md px-4">
            <AnimatePresence mode="wait">
              {transcription ? (
                <motion.p
                  key="live-transcription"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="text-base text-zinc-200 tracking-wide leading-relaxed font-sans font-medium"
                >
                  "{transcription}"
                </motion.p>
              ) : (
                <motion.p
                  key="default-tagline"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.7 }}
                  exit={{ opacity: 0 }}
                  className="text-sm font-light text-white/60 italic tracking-wide"
                >
                  {state === "disconnected"
                    ? user?.isCreator
                      ? `Welcome back, Meghraj. Ready to chat with your creation? Tap connect below.`
                      : "Don't just stand there staring, darling. Tap below and spark up a chat."
                    : state === "listening"
                    ? user?.isCreator
                      ? "I'm listening, boss. What are we building or testing today?"
                      : "I'm listening, darling. Try to make it interesting."
                    : "Calibrating synaptic voice relays..."}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Dynamic Concentric Aura Orb Section */}
        <div className="relative w-full flex items-center justify-center h-[280px]">
          <AuraOrb
            state={state}
            userVolume={userVolume}
            alizaVolume={alizaVolume}
            onToggle={handleToggleSession}
          />
        </div>

        {/* Sassy Quote Revolver or Error Messages */}
        <div className="w-full max-w-sm">
          <AnimatePresence mode="wait">
            {state === "disconnected" && !errorState && (
              <motion.div
                key="quotes"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <SassyQuotes />
                {healthStatus && (!healthStatus.serverReachable || !healthStatus.keyConfigured) && (
                  <div className="mt-3 p-3 rounded-xl border border-amber-500/30 bg-amber-950/30 text-center space-y-1">
                    <div className="text-[10px] font-mono uppercase text-amber-400 font-bold tracking-wider">
                      {!healthStatus.serverReachable
                        ? "⚠️ Node.js Backend Offline"
                        : "⚠️ Gemini API Key Required"}
                    </div>
                    <p className="text-[11px] text-amber-200/80 leading-tight">
                      {!healthStatus.serverReachable
                        ? "The app cannot reach the Node.js backend server. If hosted on a static provider like Vercel, the real-time WebSocket voice server is not running. Deploy to Google Cloud Run (via AI Studio Deploy) or Render/Railway."
                        : "The backend server is running, but GEMINI_API_KEY was not detected in environment variables. Add your Gemini API Key in your host's environment settings."}
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {(state === "error" || errorState) && (
              <motion.div
                key="err-banner"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="p-5 rounded-2xl border border-red-500/30 bg-[#0c0405] text-center space-y-3 shadow-[0_0_20px_rgba(239,68,68,0.15)]"
              >
                <h4 className="text-xs font-mono font-bold text-red-400 tracking-widest uppercase">
                  DIAGNOSTIC FAULT REPORT
                </h4>
                <p className="text-xs text-zinc-300 leading-snug">{errorState || "Connection terminated unexpectedly."}</p>
                <button
                  onClick={handleToggleSession}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-[10px] font-mono rounded-lg text-white font-bold transition-all cursor-pointer shadow-md"
                >
                  REBOOT ENGINE
                </button>
              </motion.div>
            )}

            {(state === "listening" || state === "speaking") && (
              <motion.div
                key="realtime-wave"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-12 flex items-center justify-center bg-zinc-950/20 rounded-2xl border border-white/[0.02] p-1 overflow-hidden"
              >
                <VoiceWaveform
                  analyser={state === "speaking" ? speakerAnalyser : micAnalyser}
                  volume={state === "speaking" ? alizaVolume : userVolume}
                  isActive={state === "speaking" ? true : userVolume > 0.005}
                  color={state === "speaking" ? "rgba(244, 63, 94, 0.85)" : "rgba(255, 255, 255, 0.75)"}
                  lineCount={state === "speaking" ? 4 : 2}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Quick Message Input Bar (Supports both Voice & No-Mic Speaker Mode) */}
        <form
          onSubmit={handleSendChat}
          className="w-full max-w-sm flex items-center gap-2 bg-zinc-900/60 hover:bg-zinc-900/90 border border-white/10 focus-within:border-pink-500/50 rounded-full px-3 py-1.5 transition-all shadow-lg backdrop-blur-md"
        >
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder={
              !hasMicHardware
                ? "No mic detected. Type to Aliza here..."
                : state === "listening" || state === "speaking"
                ? "Type or speak to Aliza..."
                : "Type message or tap connect below..."
            }
            className="flex-1 bg-transparent text-xs text-white placeholder-zinc-500 outline-none px-2 py-1 font-sans"
          />
          <button
            type="submit"
            disabled={!chatInput.trim()}
            className="w-7 h-7 rounded-full bg-pink-600 hover:bg-pink-500 disabled:opacity-30 disabled:hover:bg-pink-600 flex items-center justify-center text-white transition-all cursor-pointer shadow-sm"
            title="Send to Aliza"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Bottom Interactive Dashboard Controller Actions */}
        <div className="w-full max-w-md flex justify-between items-center px-4 pt-4">
          
          {/* Info & Settings Button */}
          <button
            onClick={() => setShowSettings(true)}
            className="group flex flex-col items-center gap-2.5 transition-all outline-none focus:outline-none"
          >
            <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white/5 transition-colors cursor-pointer">
              <Settings className="w-5 h-5 text-white/50 group-hover:text-white transition-colors" />
            </div>
            <span className="text-[9px] uppercase tracking-[0.2em] text-white/40 group-hover:text-white/80 font-mono">
              Settings
            </span>
          </button>

          {/* Central Play / Trigger hangup style control */}
          <button
            onClick={handleToggleSession}
            className="group relative flex flex-col items-center gap-3 outline-none focus:outline-none"
          >
            <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
              state !== "disconnected" && state !== "error"
                ? "bg-red-600/10 border border-red-500/20 group-hover:bg-red-600/20"
                : "bg-pink-600/10 border border-pink-500/20 group-hover:bg-pink-600/20"
            }`}>
              <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
                state !== "disconnected" && state !== "error"
                  ? "bg-red-600 shadow-red-600/30 group-hover:scale-105"
                  : "bg-pink-600 shadow-pink-600/30 group-hover:scale-105"
              }`}>
                {state !== "disconnected" && state !== "error" ? (
                  <PhoneOff className="w-6 h-6 text-white" />
                ) : (
                  <Phone className="w-6 h-6 text-white" />
                )}
              </div>
            </div>
            <span className={`text-[9px] uppercase tracking-[0.25em] font-mono font-bold transition-all ${
              state !== "disconnected" && state !== "error"
                ? "text-red-400 group-hover:text-red-300"
                : "text-pink-400 group-hover:text-pink-300"
            }`}>
              {state !== "disconnected" && state !== "error" ? "End Call" : "Connect"}
            </span>
          </button>

          {/* Quick Info panel switcher */}
          <button
            onClick={() => setShowSettings(true)}
            className="group flex flex-col items-center gap-2.5 transition-all outline-none focus:outline-none"
          >
            <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white/5 transition-colors cursor-pointer">
              <Info className="w-5 h-5 text-white/50 group-hover:text-white transition-colors" />
            </div>
            <span className="text-[9px] uppercase tracking-[0.2em] text-white/40 group-hover:text-white/80 font-mono">
              About
            </span>
          </button>
        </div>

        {/* Real-time Web Portals and Memory notification triggers */}
        <div className="w-full max-w-sm relative z-30">
          <MemoryBanner event={memoryEvent} onDismiss={dismissMemoryEvent} />
          <ToolBanner event={toolCallEvent} onDismiss={dismissToolCall} />
        </div>
      </div>

      {/* Slide Drawer Settings Cabinet overlay */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
            {/* Clickbackdrop to dismiss */}
            <div className="absolute inset-0" onClick={() => setShowSettings(false)} />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="relative w-full max-w-md h-full bg-[#09090b] border-l border-white/5 px-6 py-8 flex flex-col justify-between overflow-y-auto"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center space-x-2">
                    <Settings className="w-5 h-5 text-pink-500" />
                    <h3 className="text-base font-bold font-sans tracking-tight">System Configuration</h3>
                  </div>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Identity cards */}
                <div className="p-4 bg-gradient-to-tr from-[#111] to-[#040404] border border-white/5 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold font-mono tracking-widest uppercase text-pink-400 flex items-center space-x-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Personality Parameters</span>
                  </h4>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Aliza is modeled as a young, confident, witty, and sassy assistant. She communicates with a flirty, playful tone—giving you the charm and banter of an intelligent close girlfriend.
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-2 font-mono text-[9px] text-zinc-400">
                    <div className="bg-white/5 px-2 py-1.5 rounded">GENDER: FEMALE</div>
                    <div className="bg-white/5 px-2 py-1.5 rounded">TONE: SASSY, CASUAL</div>
                    <div className="bg-white/5 px-2 py-1.5 rounded">MODEL: GEMINI-3.1</div>
                    <div className="bg-white/5 px-2 py-1.5 rounded">MODALITY: AUDIO ONLY</div>
                  </div>
                </div>

                {/* Integration Details card */}
                <div className="p-4 bg-zinc-950/60 border border-zinc-900 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold font-mono tracking-widest uppercase text-zinc-400">
                    Voice Streaming Architecture
                  </h4>
                  <ul className="space-y-2 text-xs text-zinc-400">
                    <li className="flex items-start space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-pink-500 mt-1.5 shrink-0" />
                      <span>Input pipeline records voice via browser <b className="text-zinc-300">AudioContext</b> at native sampling, downsampled in real-time to 16kHz PCM16, and channeled over WebSockets.</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-pink-500 mt-1.5 shrink-0" />
                      <span>Output pipeline receives 24kHz raw PCM from Gemini Live V3.1 and schedules overlapping scheduled buffers inside dynamic playback contexts.</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-pink-500 mt-1.5 shrink-0" />
                      <span>Web search tool enables AI tool-calls. Example commands: <b className="text-zinc-200 italic">"Please open YouTube to look for music tutorials."</b></span>
                    </li>
                  </ul>
                </div>

                {/* Current User & Identity Profile Card */}
                <div className="p-4 bg-zinc-950/80 border border-white/5 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold font-mono tracking-widest uppercase text-zinc-300 flex items-center space-x-2">
                      <UserIcon className="w-3.5 h-3.5 text-pink-400" />
                      <span>Authenticated Account</span>
                    </h4>
                    {user?.isCreator && (
                      <span className="px-2 py-0.5 bg-pink-500/20 border border-pink-500/40 text-[9px] font-mono font-bold text-pink-300 rounded">
                        CREATOR
                      </span>
                    )}
                  </div>

                  {user ? (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 border border-white/10 flex items-center justify-center font-bold text-white text-xs shrink-0">
                          {user.photoUrl ? (
                            <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <span>{user.name.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                          <p className="text-[11px] text-zinc-400 font-mono truncate">{user.email}</p>
                          <p className="text-[10px] text-zinc-500 capitalize">Method: {user.provider}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setShowSettings(false);
                          openSignInModal();
                        }}
                        className="w-full py-2 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-zinc-200 hover:text-white font-medium flex items-center justify-center space-x-2 transition-all cursor-pointer"
                      >
                        <span>Switch Account / Sign In with Google</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <p className="text-xs text-zinc-400">
                        Sign in with Google to personalize your voice sessions with Aliza.
                      </p>
                      <button
                        onClick={() => {
                          setShowSettings(false);
                          openSignInModal();
                        }}
                        className="w-full py-2.5 px-3 bg-white hover:bg-zinc-100 text-zinc-900 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-md"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>Sign In with Google</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Security and Credentials status */}
                <div className="p-4 bg-[#080c14]/40 border border-blue-900/10 rounded-xl flex items-start space-x-3 text-zinc-400">
                  <Lock className="w-5 h-5 text-indigo-400 shrink-0" />
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-zinc-300">Secure Pipeline Handshake</h5>
                    <p className="text-[11px] leading-relaxed">
                      API token secrets are protected behind Server credentials proxy. No raw keys are ever loaded inside browser scopes. Safe and secure.
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/5 pt-4">
                <button
                  onClick={() => setShowSettings(false)}
                  className="w-full py-3 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white font-semibold text-xs tracking-widest uppercase rounded-xl shadow-lg shadow-fuchsia-600/15 cursor-pointer transition-all"
                >
                  Confirm Parameters
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* User Memory & History Modal */}
      <MemoryModal isOpen={isMemoryDrawerOpen} onClose={closeMemoryDrawer} />

      {/* Sign In Modal */}
      <SignInModal />

      {/* Bottom Luxury Linear Accent Progress Strip */}
      <footer className="relative z-10 w-full bg-transparent flex flex-col pointer-events-none">
        <div className="h-[5px] w-full bg-white/5 flex transition-all duration-300">
          <motion.div
            animate={{ width: getProgressWidth() }}
            transition={{ type: "spring", damping: 18, stiffness: 90 }}
            className="h-full bg-gradient-to-r from-pink-500 to-violet-500 shadow-[0_0_12px_#ec4899] duration-150"
          />
        </div>
      </footer>
    </div>
  );
}

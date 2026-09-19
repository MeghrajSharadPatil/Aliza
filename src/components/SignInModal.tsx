import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Sparkles, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { SignIn } from "./SignIn";
import { SignUp } from "./SignUp";

export function SignInModal() {
  const {
    isSignInModalOpen,
    closeSignInModal,
    signInWithGoogle,
    signInAsCreator,
    continueAsGuest,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<"google" | "email">("google");
  const [emailAuthMode, setEmailAuthMode] = useState<"signin" | "signup">("signin");
  const [showCreatorOption, setShowCreatorOption] = useState(false);

  if (!isSignInModalOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        {/* Background dismissal */}
        <div className="absolute inset-0" onClick={closeSignInModal} />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative w-full max-w-md bg-[#0d0d11] border border-white/10 rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_35px_rgba(244,63,94,0.12)] p-6 sm:p-7 overflow-hidden z-10"
        >
          {/* Subtle top ambient glow */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-pink-500 via-indigo-500 to-cyan-500" />
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-24 bg-pink-500/10 blur-2xl rounded-full pointer-events-none" />

          {/* Close button */}
          <button
            onClick={closeSignInModal}
            className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="space-y-1.5 mb-6 text-left">
            <div className="flex items-center space-x-2 text-[10px] font-mono tracking-widest text-pink-400 uppercase font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Identity Verification</span>
            </div>
            <h3 className="text-2xl font-bold font-sans tracking-tight text-white">
              Sign In to Aliza
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Authenticate your identity to personalize your real-time voice sessions, voice presets, and memories.
            </p>
          </div>

          {/* Tab Selector */}
          <div className="grid grid-cols-2 p-1 bg-zinc-950/80 border border-white/5 rounded-xl mb-5 text-xs font-medium">
            <button
              onClick={() => setActiveTab("google")}
              className={`py-2 rounded-lg transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                activeTab === "google"
                  ? "bg-zinc-800/90 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <GoogleSvgIcon className="w-4 h-4" />
              <span>Google Sign-In</span>
            </button>
            <button
              onClick={() => setActiveTab("email")}
              className={`py-2 rounded-lg transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                activeTab === "email"
                  ? "bg-zinc-800/90 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Mail className="w-4 h-4" />
              <span>Email & Password</span>
            </button>
          </div>

          {activeTab === "google" ? (
            <div className="space-y-4 py-2">
              {/* Standard Sign in with Google Button */}
              <button
                type="button"
                onClick={() => signInWithGoogle()}
                className="w-full py-3.5 px-4 bg-white hover:bg-zinc-100 text-zinc-900 rounded-xl font-medium text-xs flex items-center justify-center space-x-3 shadow-md transition-all cursor-pointer border border-zinc-200"
              >
                <GoogleSvgIcon className="w-5 h-5" />
                <span className="font-semibold text-sm">Sign in with Google</span>
              </button>
            </div>
          ) : (
            /* Email / Supabase Auth tab */
            <div className="space-y-3">
              <div className="flex border-b border-white/10 mb-3">
                <button
                  type="button"
                  onClick={() => setEmailAuthMode("signin")}
                  className={`flex-1 pb-2 text-xs font-semibold transition-colors cursor-pointer border-b-2 ${
                    emailAuthMode === "signin"
                      ? "text-white border-pink-500"
                      : "text-zinc-400 border-transparent hover:text-zinc-200"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setEmailAuthMode("signup")}
                  className={`flex-1 pb-2 text-xs font-semibold transition-colors cursor-pointer border-b-2 ${
                    emailAuthMode === "signup"
                      ? "text-white border-pink-500"
                      : "text-zinc-400 border-transparent hover:text-zinc-200"
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {emailAuthMode === "signin" ? (
                <SignIn
                  onSuccess={closeSignInModal}
                  onSwitchToSignUp={() => setEmailAuthMode("signup")}
                />
              ) : (
                <SignUp
                  onSuccess={closeSignInModal}
                  onSwitchToSignIn={() => setEmailAuthMode("signin")}
                />
              )}
            </div>
          )}

          {/* Guest fallback option */}
          <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-zinc-400">
            <span>Just testing out Aliza?</span>
            <button
              onClick={continueAsGuest}
              className="text-zinc-300 hover:text-white font-medium underline underline-offset-4 cursor-pointer transition-colors"
            >
              Continue as Guest
            </button>
          </div>

          {/* Discreet Owner Access Toggle */}
          <div className="mt-3 pt-2 text-center">
            {!showCreatorOption ? (
              <button
                type="button"
                onClick={() => setShowCreatorOption(true)}
                className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer"
              >
                Owner access
              </button>
            ) : (
              <div className="p-2.5 rounded-lg border border-pink-500/20 bg-pink-950/20 flex items-center justify-between">
                <span className="text-[11px] text-pink-300 font-mono flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Creator Mode
                </span>
                <button
                  type="button"
                  onClick={signInAsCreator}
                  className="px-2.5 py-1 bg-pink-600 hover:bg-pink-500 text-white rounded text-[10px] font-bold tracking-wider uppercase transition-colors cursor-pointer"
                >
                  Log In as Meghraj
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// Crisp official multi-color Google SVG Icon
export function GoogleSvgIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
        fill="#4285F4"
      />
      <path
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
        fill="#34A853"
      />
      <path
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
        fill="#FBBC05"
      />
      <path
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
        fill="#EA4335"
      />
    </svg>
  );
}

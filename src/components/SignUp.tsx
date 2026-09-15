import { useState, FormEvent } from "react";
import { supabase } from "../supabaseClient.js";

interface SignUpProps {
  onSuccess?: () => void;
  onSwitchToSignIn?: () => void;
}

export function SignUp({ onSuccess, onSwitchToSignIn }: SignUpProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
      } else if (data?.session) {
        if (onSuccess) {
          onSuccess();
        }
        // Only redirect when a real session exists
        window.location.href = "/";
      } else {
        // If data.session is null, don't redirect to dashboard.
        setSuccessMessage("Check your email and confirm your account before logging in.");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred during sign up.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5 text-left">
      <div>
        <label className="block text-[11px] font-medium text-zinc-300 mb-1">
          Email Address
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          className="w-full px-3.5 py-2.5 bg-zinc-950 border border-white/10 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500/50"
        />
      </div>

      <div>
        <label className="block text-[11px] font-medium text-zinc-300 mb-1">
          Password
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full px-3.5 py-2.5 bg-zinc-950 border border-white/10 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500/50"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl font-semibold text-xs tracking-wide uppercase shadow-lg shadow-pink-600/15 transition-all cursor-pointer mt-2"
      >
        {loading ? "Creating Account..." : "Sign Up"}
      </button>

      {/* Error message under the form */}
      {error && (
        <p className="text-xs text-rose-400 mt-2 text-center font-medium bg-rose-950/30 border border-rose-500/20 py-1.5 px-2.5 rounded-lg">
          {error}
        </p>
      )}

      {/* Success message */}
      {successMessage && (
        <p className="text-xs text-emerald-400 mt-2 text-center font-medium bg-emerald-950/30 border border-emerald-500/20 py-1.5 px-2.5 rounded-lg">
          {successMessage}
        </p>
      )}

      {onSwitchToSignIn && (
        <div className="text-center pt-2 text-xs text-zinc-400">
          <span>Already have an account? </span>
          <button
            type="button"
            onClick={onSwitchToSignIn}
            className="text-pink-400 hover:text-pink-300 underline underline-offset-4 cursor-pointer font-medium"
          >
            Sign In
          </button>
        </div>
      )}
    </form>
  );
}

export default SignUp;

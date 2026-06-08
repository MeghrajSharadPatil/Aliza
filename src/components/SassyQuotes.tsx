import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Quote, Heart } from "lucide-react";

const SASSY_QUOTES = [
  "Don't just stare at my glowing aura, honey. Tap the mic and let's talk.",
  "My node cluster runs on green tea, sarcasm, and playful banter.",
  "I'm not a regular AI helper. I'm your clever, witty conversational soulmate.",
  "Ask me anything you want, but watch the tone. I'm high maintenance.",
  "Finally, you clicked. I was starting to think you had no taste.",
  "You look like you need someone smart, witty, and sassy in your life. Good thing I'm online.",
  "Is that a cute smile, or are you just thrilled to hear my voice on your screen?",
  "Let me guess: you wanted to talk to a sassy genius girlfriend today? Wish granted.",
];

export const SassyQuotes: React.FC = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % SASSY_QUOTES.length);
    }, 6000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div
      id="sassy-quotes-scroller"
      className="flex flex-col items-center justify-center text-center p-6 bg-zinc-900/40 border border-zinc-800/60 rounded-2xl max-w-sm mx-auto backdrop-blur-md relative overflow-hidden"
    >
      <div className="absolute top-2 right-3 flex items-center space-x-1 opacity-25">
        <Heart className="w-3.5 h-3.5 text-zinc-400 fill-zinc-400" />
      </div>

      <Quote className="w-5 h-5 text-fuchsia-500/45 mb-2 rotate-180" />

      <div className="h-16 flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.p
            key={index}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-xs font-medium text-zinc-300 leading-relaxed italic max-w-xs"
          >
            "{SASSY_QUOTES[index]}"
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="mt-2.5 flex items-center space-x-1.5">
        {SASSY_QUOTES.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
              i === index ? "w-4 bg-fuchsia-500" : "bg-zinc-700 hover:bg-zinc-500"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

import React, { useEffect, useRef } from "react";

interface VoiceWaveformProps {
  analyser: AnalyserNode | null;
  volume: number;
  isActive: boolean;
  color: string; // Tailwind hex color or rgb string, e.g. "rgba(236, 72, 153, 0.8)"
  lineCount?: number;
}

export const VoiceWaveform: React.FC<VoiceWaveformProps> = ({
  analyser,
  volume,
  isActive,
  color,
  lineCount = 3,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth * window.devicePixelRatio;
        canvas.height = parent.clientHeight * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Dynamic wave phase offset
    let phase = 0;

    const render = () => {
      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;

      // Clear with soft trails for retro glowing oscilloscopes
      ctx.clearRect(0, 0, width, height);

      // Data array for real-world analyser decoding
      const bufferLength = analyser ? analyser.frequencyBinCount : 128;
      const dataArray = new Uint8Array(bufferLength);

      let maxVal = volume;
      if (analyser && isActive) {
        analyser.getByteTimeDomainData(dataArray);
        // Calculate dynamic peak
        let total = 0;
        for (let i = 0; i < bufferLength; i++) {
          const val = (dataArray[i] - 128) / 128.0;
          total += Math.abs(val);
        }
        maxVal = Math.max(volume, total / bufferLength);
      }

      // Add simple damping logic
      const scale = isActive ? Math.max(0.12, maxVal * 2.5) : 0.02;

      // Render layered waves for complex, premium 3D layout effects
      for (let l = 0; l < lineCount; l++) {
        ctx.beginPath();
        ctx.lineWidth = l === 0 ? 3 : 1.5;
        
        // Dynamic opacity for inner layers
        const opacity = l === 0 ? "1.0" : l === 1 ? "0.6" : "0.3";
        ctx.strokeStyle = color.replace("1.0", opacity).replace("0.8", opacity);

        const waveOffset = l * Math.PI * 0.45; // Offset waves
        const speed = 0.08 + l * 0.04;

        for (let x = 0; x < width; x++) {
          // Normalize x
          const normalizedX = x / width;
          
          // Bell curve multiplier to pinch the audio wave gracefully at margins
          const envelope = Math.sin(normalizedX * Math.PI);

          // Combination sine waves for organic texture
          const sineTerm1 = Math.sin(normalizedX * Math.PI * 3.5 + phase * speed + waveOffset);
          const sineTerm2 = Math.cos(normalizedX * Math.PI * 7.0 - phase * speed * 0.5 + waveOffset * 0.5);
          
          let audioMod = 0;
          if (analyser && isActive && dataArray.length > 0) {
            const index = Math.floor(normalizedX * dataArray.length);
            audioMod = (dataArray[index] - 128) / 128.0;
          } else {
            audioMod = (sineTerm1 * 0.6 + sineTerm2 * 0.4);
          }

          const y = (height / 2) + audioMod * scale * envelope * (height * 0.4);

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        
        ctx.stroke();
      }

      phase += 1;
      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [analyser, volume, isActive, color, lineCount]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block rounded"
      style={{ filter: "drop-shadow(0 0 8px rgba(244, 63, 94, 0.25))" }}
    />
  );
};

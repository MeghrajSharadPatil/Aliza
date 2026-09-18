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

  // Use refs for continuously changing audio data to avoid tearing down and blinking canvas
  const analyserRef = useRef(analyser);
  analyserRef.current = analyser;
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;
  const colorRef = useRef(color);
  colorRef.current = color;
  const lineCountRef = useRef(lineCount);
  lineCountRef.current = lineCount;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastW = 0;
    let lastH = 0;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        const targetW = parent.clientWidth * window.devicePixelRatio;
        const targetH = parent.clientHeight * window.devicePixelRatio;
        if (targetW !== lastW || targetH !== lastH) {
          lastW = targetW;
          lastH = targetH;
          canvas.width = targetW;
          canvas.height = targetH;
          ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
        }
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

      const currentAnalyser = analyserRef.current;
      const currentActive = isActiveRef.current;
      const currentVol = volumeRef.current;
      const currentColor = colorRef.current;
      const currentLines = lineCountRef.current;

      // Data array for real-world analyser decoding
      const bufferLength = currentAnalyser ? currentAnalyser.frequencyBinCount : 128;
      const dataArray = new Uint8Array(bufferLength);

      let maxVal = currentVol;
      if (currentAnalyser && currentActive) {
        currentAnalyser.getByteTimeDomainData(dataArray);
        // Calculate dynamic peak
        let total = 0;
        for (let i = 0; i < bufferLength; i++) {
          const val = (dataArray[i] - 128) / 128.0;
          total += Math.abs(val);
        }
        maxVal = Math.max(currentVol, total / bufferLength);
      }

      // Add simple damping logic
      const scale = currentActive ? Math.max(0.12, maxVal * 2.5) : 0.02;

      // Render layered waves for complex, premium 3D layout effects
      for (let l = 0; l < currentLines; l++) {
        ctx.beginPath();
        ctx.lineWidth = l === 0 ? 3 : 1.5;
        
        // Dynamic opacity for inner layers
        const opacity = l === 0 ? "1.0" : l === 1 ? "0.6" : "0.3";
        ctx.strokeStyle = currentColor.replace("1.0", opacity).replace("0.8", opacity);

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
          if (currentAnalyser && currentActive && dataArray.length > 0) {
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
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block rounded"
      style={{ filter: "drop-shadow(0 0 8px rgba(244, 63, 94, 0.25))" }}
    />
  );
};

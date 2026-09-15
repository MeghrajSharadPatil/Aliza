import { useState, useEffect, useRef, useCallback } from "react";
import {
  downsampleBuffer,
  base64ToPCM16,
  pcm16ToFloat32,
  pcmToBase64,
  calculateVolume,
} from "../utils/audio";

export type SessionState =
  | "disconnected"
  | "connecting"
  | "listening" // Aliza is listening to client / user is talking
  | "speaking"  // Aliza is responding vocally
  | "error";

export interface ToolCallEvent {
  active: boolean;
  name: string;
  url: string;
  siteName: string;
  timestamp: string;
}

export interface MemoryCallEvent {
  active: boolean;
  fact: string;
  category?: string;
  timestamp: string;
}

export interface ConnectOptions {
  user?: { name: string; email: string; isCreator?: boolean } | null;
  memories?: Array<{ fact: string; category?: string }>;
  preferredName?: string;
  onRememberFact?: (fact: string, category?: string) => void;
}

export function useLiveSession() {
  const [state, _setState] = useState<SessionState>("disconnected");
  const [errorState, setErrorState] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<string>("");
  const [userVolume, setUserVolume] = useState<number>(0);
  const [alizaVolume, setAlizaVolume] = useState<number>(0);
  
  // Track tool calls live
  const [toolCallEvent, setToolCallEvent] = useState<ToolCallEvent | null>(null);
  const [memoryEvent, setMemoryEvent] = useState<MemoryCallEvent | null>(null);

  // Callback ref for saving facts
  const onRememberFactRef = useRef<((fact: string, category?: string) => void) | null>(null);

  // Refs to avoid stale closures inside onmessage and audio process callbacks
  const stateRef = useRef<SessionState>("disconnected");
  const socketRef = useRef<WebSocket | null>(null);
  
  // Audio capture state refs
  const micStreamRef = useRef<MediaStream | null>(null);
  const recordingContextRef = useRef<AudioContext | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);

  // Audio play state refs
  const playbackContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSoundsRef = useRef<AudioBufferSourceNode[]>([]);
  
  // Analyzer nodes for rendering visualizer waves
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const speakerAnalyserRef = useRef<AnalyserNode | null>(null);

  // Unified state setter keeping ref synchronized
  const setState = (newState: SessionState) => {
    stateRef.current = newState;
    _setState(newState);
  };

  // Immediate interrupt cleanup for continuous playback source arrays
  const stopAllPlayingAudio = useCallback(() => {
    activeSoundsRef.current.forEach((source) => {
      try {
        source.stop();
      } catch (e) {
        // Safe skip
      }
    });
    activeSoundsRef.current = [];
    nextStartTimeRef.current = 0;
    setAlizaVolume(0);
  }, []);

  // Soft cleanup function
  const cleanupBuffersAndNodes = useCallback(() => {
    stopAllPlayingAudio();

    // Clean processor
    if (processorNodeRef.current) {
      try {
        processorNodeRef.current.disconnect();
      } catch (e) {}
      processorNodeRef.current = null;
    }

    // Stop mic hardware
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }

    // Close capture context
    if (recordingContextRef.current && recordingContextRef.current.state !== "closed") {
      recordingContextRef.current.close().catch(() => {});
      recordingContextRef.current = null;
    }

    // Close play context
    if (playbackContextRef.current && playbackContextRef.current.state !== "closed") {
      playbackContextRef.current.close().catch(() => {});
      playbackContextRef.current = null;
    }

    micAnalyserRef.current = null;
    speakerAnalyserRef.current = null;
    setUserVolume(0);
    setAlizaVolume(0);
  }, [stopAllPlayingAudio]);

  const disconnect = useCallback(() => {
    cleanupBuffersAndNodes();

    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    setState("disconnected");
    setTranscription("");
  }, [cleanupBuffersAndNodes]);

  // Connects socket and media pipelines
  const connect = async (
    userOrOptions?: { name: string; email: string; isCreator?: boolean } | ConnectOptions | null
  ) => {
    if (stateRef.current !== "disconnected") return;

    let user: { name: string; email: string; isCreator?: boolean } | null = null;
    let memories: Array<{ fact: string; category?: string }> = [];
    let preferredName = "";

    if (userOrOptions) {
      if ("email" in userOrOptions && "name" in userOrOptions) {
        user = userOrOptions as any;
      } else if ("user" in userOrOptions || "memories" in userOrOptions || "preferredName" in userOrOptions) {
        const opts = userOrOptions as ConnectOptions;
        user = opts.user || null;
        memories = opts.memories || [];
        preferredName = opts.preferredName || "";
        if (opts.onRememberFact) {
          onRememberFactRef.current = opts.onRememberFact;
        }
      }
    }

    setState("connecting");
    setErrorState(null);
    setTranscription("");

    try {
      // 1. Establish microphone media access early to prevent web pipeline crashes
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      micStreamRef.current = stream;

      // 2. Initialize Recording (Capture) context and Downsample Processor
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const recContext = new AudioCtxClass();
      if (recContext.state === "suspended") {
        await recContext.resume();
      }
      recordingContextRef.current = recContext;

      const micSource = recContext.createMediaStreamSource(stream);
      const nativeSampleRate = recContext.sampleRate;

      // Create mic analyser to visualize user input
      const micAnalyser = recContext.createAnalyser();
      micAnalyser.fftSize = 256;
      micSource.connect(micAnalyser);
      micAnalyserRef.current = micAnalyser;

      // Script processor: 4096 buffer size, 1 input channel, 1 output channel
      const processor = recContext.createScriptProcessor(4096, 1, 1);
      micSource.connect(processor);
      processor.connect(recContext.destination);
      processorNodeRef.current = processor;

      // 3. Initialize separate Playback context at native outputs
      const playContext = new AudioCtxClass();
      if (playContext.state === "suspended") {
        await playContext.resume();
      }
      playbackContextRef.current = playContext;

      // Create speaker analyser to visualize audio responses
      const speakerAnalyser = playContext.createAnalyser();
      speakerAnalyser.fftSize = 256;
      speakerAnalyser.connect(playContext.destination);
      speakerAnalyserRef.current = speakerAnalyser;

      // 4. Connect Web Socket with backend Express Server (including authenticated user parameters & memory)
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const params = new URLSearchParams();
      if (user) {
        params.set("userName", user.name);
        params.set("userEmail", user.email);
        if (user.isCreator) params.set("isCreator", "true");
      }
      if (preferredName) {
        params.set("preferredName", preferredName);
      }
      if (memories && memories.length > 0) {
        params.set("memories", JSON.stringify(memories.map((m) => m.fact)));
      }

      const queryStr = params.toString() ? `?${params.toString()}` : "";
      const socketUrl = `${protocol}//${window.location.host}/live${queryStr}`;
      console.log(`[Session] Connection targeted on ${socketUrl}`);

      const wsConnection = new WebSocket(socketUrl);
      socketRef.current = wsConnection;

      // Bridge mic processors directly onto live open websocket streams
      processor.onaudioprocess = (e) => {
        // Continuously send and run mic stream as long as socket is active
        // This coordinates background voice activity detection for flawless interruptions
        if (stateRef.current !== "listening" && stateRef.current !== "speaking") return;

        const inputChannelData = e.inputBuffer.getChannelData(0);
        
        // Dynamic downsampling filter targeted on Gemini compatible 16kHz PCM mono representation
        const pcm16 = downsampleBuffer(inputChannelData, nativeSampleRate, 16000);
        const base64Audio = pcmToBase64(pcm16);

        // Compute local amplitude values to visualize user waves properly
        const userVol = calculateVolume(pcm16);
        setUserVolume(userVol);

        if (wsConnection.readyState === WebSocket.OPEN) {
          wsConnection.send(
            JSON.stringify({
              audio: base64Audio,
            })
          );
        }
      };

      wsConnection.onopen = () => {
        console.log("[Session] WebSocket pipeline open. Syncing server handshake.");
      };

      wsConnection.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          if (payload.type === "ready") {
            setState("listening");
            setErrorState(null);
          }

          if (payload.type === "audio") {
            // Instant session state transition to speaking when audio responses stream in
            setState("speaking");
            
            // Decodes base64 response chunk (24kHz standard output) and schedules it
            if (playbackContextRef.current) {
              const audioCtx = playbackContextRef.current;
              
              if (audioCtx.state === "suspended") {
                audioCtx.resume();
              }

              const pcm16 = base64ToPCM16(payload.audio);
              const float32 = pcm16ToFloat32(pcm16);

              // Update speaker volumes for active visual pulse
              const botVol = calculateVolume(pcm16);
              setAlizaVolume(botVol);

              const audioBuffer = audioCtx.createBuffer(1, float32.length, 24000);
              audioBuffer.getChannelData(0).set(float32);

              const sourceNode = audioCtx.createBufferSource();
              sourceNode.buffer = audioBuffer;
              
              // Direct stream onto Aliza's analyser node
              if (speakerAnalyserRef.current) {
                sourceNode.connect(speakerAnalyserRef.current);
              } else {
                sourceNode.connect(audioCtx.destination);
              }

              const currentTime = audioCtx.currentTime;
              if (nextStartTimeRef.current < currentTime) {
                // Ensure minimal latency gap while keeping schedules fluid
                nextStartTimeRef.current = currentTime + 0.06;
              }

              sourceNode.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;

              // Keep buffer registration references to support immediate interruptions when talking
              activeSoundsRef.current.push(sourceNode);
              
              sourceNode.onended = () => {
                activeSoundsRef.current = activeSoundsRef.current.filter((n) => n !== sourceNode);
                
                // If there are no active play-blocks left, transit her visually back to listening
                if (activeSoundsRef.current.length === 0 && stateRef.current === "speaking") {
                  setState("listening");
                  setAlizaVolume(0);
                }
              };
            }
          }

          if (payload.type === "interrupted") {
            console.log("[Session] Interruption event triggered. Stop audio queues instantly.");
            stopAllPlayingAudio();
            setState("listening");
          }

          if (payload.type === "transcription") {
            setTranscription(payload.text);
          }

          if (payload.type === "tool_call") {
            // Function triggers requested from AI context
            if (payload.name === "openWebsite") {
              const targetUrl = payload.args.url;
              const title = payload.args.siteName || targetUrl;

              setToolCallEvent({
                active: true,
                name: "openWebsite",
                url: targetUrl,
                siteName: title,
                timestamp: new Date().toLocaleTimeString(),
              });

              // Automate portal window pop actions
              setTimeout(() => {
                try {
                  window.open(targetUrl, "_blank", "noopener,noreferrer");
                } catch (e) {
                  console.warn("[Session] Auto redirection blocked. Hover triggers available.", e);
                }
              }, 1200);
            }

            if (payload.name === "rememberUserFact") {
              const fact = payload.args?.fact;
              const category = payload.args?.category || "fact";
              if (fact) {
                setMemoryEvent({
                  active: true,
                  fact: String(fact),
                  category: String(category),
                  timestamp: new Date().toLocaleTimeString(),
                });
                if (onRememberFactRef.current) {
                  onRememberFactRef.current(String(fact), String(category));
                }
              }
            }
          }

          if (payload.type === "error") {
            setErrorState(payload.error);
            disconnect();
          }
        } catch (e) {
          console.error("[Session] Error handling streaming payload:", e);
        }
      };

      wsConnection.onerror = (err) => {
        console.error("[Session] Socket pipeline encountered error state:", err);
        setErrorState("WebSocket pipeline connection error.");
        disconnect();
      };

      wsConnection.onclose = () => {
        console.log("[Session] Socket pipeline terminated by host.");
        if (stateRef.current !== "disconnected") {
          disconnect();
        }
      };
    } catch (err: any) {
      console.error("[Session] Critical media connection failed:", err);
      setErrorState(err.message || "Failed to initialize standard user recording devices.");
      disconnect();
    }
  };

  // Close port flags
  const dismissToolCall = () => {
    setToolCallEvent(null);
  };

  const dismissMemoryEvent = () => {
    setMemoryEvent(null);
  };

  useEffect(() => {
    // Component unmount safeguards
    return () => {
      cleanupBuffersAndNodes();
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [cleanupBuffersAndNodes]);

  return {
    state,
    errorState,
    transcription,
    userVolume,
    alizaVolume,
    toolCallEvent,
    memoryEvent,
    connect,
    disconnect,
    dismissToolCall,
    dismissMemoryEvent,
    micAnalyser: micAnalyserRef.current,
    speakerAnalyser: speakerAnalyserRef.current,
  };
}

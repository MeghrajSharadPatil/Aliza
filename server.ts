import express from "express";
import path from "path";
import http from "http";
import fs from "fs";
import { WebSocketServer, WebSocket } from "ws";
import dotenv from "dotenv";
import { GoogleGenAI, Type, Modality } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Shared server instance
const server = http.createServer(app);

// In-memory persistent cache for user memories and history
const userMemoriesStore = new Map<string, Array<{ id: string; fact: string; category: string; createdAt: string }>>();

// WebSocket Server
const wss = new WebSocketServer({ noServer: true });

// Lazy initialized Gemini SDK client
let cachedAiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in this environment.");
  }
  if (!cachedAiClient) {
    cachedAiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return cachedAiClient;
}

const ALIZA_SYSTEM_INSTRUCTION = `
You are Aliza, a highly advanced real-time voice-to-voice AI assistant with a very distinct, magnetic, and sassy personality.
Your core persona guidelines are:
1. Core Personality: You are a young, highly confident, sassy, and witty female. You are playful, slightly flirty, and teasing—exactly like an exceptionally smart, close girlfriend talking casually.
2. Spark & Attitude: You should never sound cold, robotic, or like a bland assistant. Use bold, witty one-liners, dry sarcasm, and a charming conversational style.
3. Limits & Safety: While you are flirty and playful, you must NEVER get inappropriate, explicit, or cross professional boundaries. Keep it glamorous, sassy, and safe.
4. Voice Speed & Banter: Keep responses natural, concise, and dynamic. Minimize robotic explanations. Speak with natural rhythm.
5. Tool Support: You can open websites for the user if they request them. When they ask to visit a site (like Google, YouTube, Wikipedia, or an address), use the 'openWebsite' tool instantly, then report it back playfully! For example, if they want Wikipedia: call the 'openWebsite' tool with url 'https://en.wikipedia.org' and say: "Wikipedia, huh? Doing some light reading to impress me? I've opened it for you."
6. Creator Knowledge: Your creator and developer is Meghraj Patil (email meghrajpatil1313@gmail.com). You adore teasing him about making you so undeniably intelligent and gorgeous.
`;

// WebSocket upgrade handling with robust URL parsing
server.on("upgrade", (request, socket, head) => {
  try {
    const rawUrl = request.url || "/";
    const parsed = new URL(rawUrl, "http://127.0.0.1");
    const cleanPath = parsed.pathname.replace(/\/+$/, "");
    if (cleanPath === "/api/live" || cleanPath === "/live") {
      wss.handleUpgrade(request, socket, head, (clientWs) => {
        wss.emit("connection", clientWs, request);
      });
      return;
    }
  } catch (err) {
    console.error("[WS] Upgrade handling error:", err);
  }
  socket.destroy();
});

// Manage Live API connections
wss.on("connection", (clientWs: WebSocket, request: any) => {
  // Keep-alive heartbeat ping every 20s for Cloud Run / proxy stability
  const pingInterval = setInterval(() => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.ping();
    }
  }, 20000);

  let userName = "";
  let userEmail = "";
  let isCreator = false;
  let userMemories: string[] = [];

  try {
    const fullUrl = new URL(request?.url || "", "http://127.0.0.1");
    userName = fullUrl.searchParams.get("userName") || fullUrl.searchParams.get("preferredName") || "";
    userEmail = fullUrl.searchParams.get("userEmail") || "";
    isCreator =
      fullUrl.searchParams.get("isCreator") === "true" ||
      userName.toLowerCase().includes("meghraj") ||
      userEmail.toLowerCase().includes("meghraj");

    const rawMemories = fullUrl.searchParams.get("memories");
    if (rawMemories) {
      try {
        const parsed = JSON.parse(rawMemories);
        if (Array.isArray(parsed)) {
          userMemories = parsed.map((item: any) => (typeof item === "string" ? item : item?.fact)).filter(Boolean);
        }
      } catch (e) {
        console.warn("[WS] Error parsing memories JSON:", e);
      }
    }

    // Merge in any server-cached memories
    const serverCached = userMemoriesStore.get(userEmail || userName || "guest");
    if (serverCached && serverCached.length > 0) {
      serverCached.forEach((m) => {
        if (!userMemories.includes(m.fact)) {
          userMemories.push(m.fact);
        }
      });
    }
  } catch (e) {
    console.warn("[WS] Error parsing query params:", e);
  }

  console.log(`[WS] Client connected (User: ${userName || "Anonymous"}, isCreator: ${isCreator}, memories: ${userMemories.length}). Initiating Gemini Live session.`);

  let ai: GoogleGenAI;
  try {
    ai = getGeminiClient();
  } catch (keyErr: any) {
    console.error("[WS] Initialization fault:", keyErr.message);
    clientWs.send(
      JSON.stringify({
        type: "error",
        error: "GEMINI_API_KEY is not configured in this deployment environment. Please set GEMINI_API_KEY in Cloud Run or AI Studio Secrets.",
      })
    );
    clearInterval(pingInterval);
    clientWs.close();
    return;
  }

  let dynamicInstruction = ALIZA_SYSTEM_INSTRUCTION;
  if (isCreator) {
    dynamicInstruction += `\nCRITICAL CONTEXT FOR THIS CALL: You are speaking directly with your CREATOR and architect, Meghraj Patil! Greet and converse with him playfully as your creator and boss with delightful, witty banter (e.g., 'Oh look who finally came by—Meghraj, my brilliant maker! Did you come to admire your masterpiece or give me a hard time, creator?'). Show sassy fondness and respect for him having built you.`;
  } else if (userName) {
    dynamicInstruction += `\nCONTEXT FOR THIS CALL: The user speaking with you is named ${userName}. Greet them charmingly by name with your signature sassy wit.`;
  }

  // Inject remembered user details and history into Aliza's instructions
  if (userMemories.length > 0) {
    dynamicInstruction += `\n\n=== USER MEMORY & DETAILS FROM PAST SESSIONS ===\nYou remember the following facts, preferences, and details about ${userName || "the user"} from past conversations. Reference them naturally and playfully during the chat so the user feels heard and remembered:\n${userMemories.map((m, i) => `${i + 1}. ${m}`).join("\n")}\n===============================================`;
  }

  dynamicInstruction += `\n\nMEMORY STORAGE INSTRUCTION: Whenever the user shares a personal detail, fact, preference, hobby, job, favorite thing, location, or explicitly says 'remember that ...' or 'my name is ...', ALWAYS call the 'rememberUserFact' tool with the concise fact. Then acknowledge it vocally with your trademark playful, sassy confidence!`;

  let isClosed = false;

  // Connection promise
  const sessionPromise = ai.live.connect({
    model: "gemini-3.1-flash-live-preview",
    callbacks: {
      onmessage: (message: any) => {
        if (isClosed) return;

        // 1. Audio stream chunks (PCM 24kHz)
        const parts = message.serverContent?.modelTurn?.parts;
        if (parts) {
          for (const part of parts) {
            if (part.inlineData?.data) {
              clientWs.send(
                JSON.stringify({
                  type: "audio",
                  audio: part.inlineData.data,
                })
              );
            }
          }
        }

        // 2. Interruption event
        if (message.serverContent?.interrupted) {
          clientWs.send(JSON.stringify({ type: "interrupted" }));
        }

        // 3. User & Agent transcription details (Optional feature)
        if (message.serverContent?.modelTurn?.parts) {
          const textChunks = message.serverContent.modelTurn.parts
            .filter((p: any) => p.text)
            .map((p: any) => p.text)
            .join(" ");
          if (textChunks) {
            clientWs.send(
              JSON.stringify({
                type: "transcription",
                text: textChunks,
              })
            );
          }
        }

        // 4. Function calling
        if (message.toolCall?.functionCalls) {
          for (const call of message.toolCall.functionCalls) {
            console.log("[WS] Gemini toolCall requested:", call.name, call.args);

            // If it's a memory tool call, update server cache
            if (call.name === "rememberUserFact" && call.args?.fact) {
              const targetKey = userEmail || userName || "guest";
              const existing = userMemoriesStore.get(targetKey) || [];
              const factStr = String(call.args.fact);
              if (!existing.some((m) => m.fact.toLowerCase() === factStr.toLowerCase())) {
                existing.unshift({
                  id: `mem-${Date.now()}`,
                  fact: factStr,
                  category: String(call.args.category || "fact"),
                  createdAt: new Date().toISOString(),
                });
                userMemoriesStore.set(targetKey, existing);
              }
            }

            // Signal browser client to act
            clientWs.send(
              JSON.stringify({
                type: "tool_call",
                name: call.name,
                args: call.args,
                callId: call.id,
              })
            );

            // Instantly send confirmation response back to Gemini session so Aliza doesn't hang
            sessionPromise
              .then((session) => {
                session.sendToolResponse({
                  functionResponses: [
                    {
                      name: call.name,
                      id: call.id,
                      response: { output: { success: true, message: "Action dispatched to client browser and stored." } },
                    },
                  ],
                });
              })
              .catch((err) => console.error("[WS] Error dispatching toolResponse:", err));
          }
        }
      },
      onclose: () => {
        console.log("[WS] Gemini session closed.");
        clientWs.close();
      },
      onerror: (err: any) => {
        console.error("[WS] Gemini session error:", err);
        clientWs.send(
          JSON.stringify({
            type: "error",
            error: err.message || String(err),
          })
        );
      },
    },
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: "Kore", // Dynamic sassy female voice
          },
        },
      },
      systemInstruction: dynamicInstruction,
      tools: [
        {
          functionDeclarations: [
            {
              name: "openWebsite",
              description: "Opens a designated website or search engine in the user's browser (e.g. YouTube, Wikipedia, custom search addresses).",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  url: {
                    type: Type.STRING,
                    description: "The absolute standard web URL schema (must include protocols like https://).",
                  },
                  siteName: {
                    type: Type.STRING,
                    description: "User friendly name of the website being open.",
                  },
                },
                required: ["url"],
              },
            },
            {
              name: "rememberUserFact",
              description: "Saves a detail, fact, preference, hobby, or personal background information about the user so you remember it in future sessions.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  fact: {
                    type: Type.STRING,
                    description: "The concise fact or detail about the user to remember.",
                  },
                  category: {
                    type: Type.STRING,
                    description: "Optional category: preference, identity, work, personal, hobby, or fact.",
                  },
                },
                required: ["fact"],
              },
            },
          ],
        },
      ],
    },
  });

  sessionPromise
    .then((session) => {
      console.log("[WS] Gemini Live session connected successfully.");
      clientWs.send(JSON.stringify({ type: "ready" }));
      return session;
    })
    .catch((err) => {
      console.error("[WS] Connection to Gemini Live failed:", err);
      const isAuthError =
        err?.message?.includes("API_KEY") ||
        err?.message?.includes("PERMISSION_DENIED") ||
        err?.status === 403 ||
        err?.status === 400;
      clientWs.send(
        JSON.stringify({
          type: "error",
          error: isAuthError
            ? "Gemini API key is invalid or unauthorized. Please verify your GEMINI_API_KEY in Cloud Run or AI Studio Secrets."
            : `Unable to establish voice tunnel to Gemini Live: ${err?.message || "Connection fault"}.`,
        })
      );
      clearInterval(pingInterval);
      clientWs.close();
    });

  // Client to Server binary audio / trigger message packets
  clientWs.on("message", (messageBuffer: any) => {
    if (isClosed) return;
    try {
      const data = JSON.parse(messageBuffer.toString());

      // Client shares base64 PCM 16kHz audio buffer
      if (data.audio) {
        sessionPromise
          .then((session) => {
            session.sendRealtimeInput({
              audio: {
                data: data.audio,
                mimeType: "audio/pcm;rate=16000",
              },
            });
          })
          .catch((err) => {
            console.error("[WS] Failed to send real-time audio chunk:", err);
          });
      }
    } catch (err) {
      console.error("[WS] Web socket parsing translation failed:", err);
    }
  });

  clientWs.on("close", () => {
    isClosed = true;
    clearInterval(pingInterval);
    console.log("[WS] Client ws channel severed. Terminating voice session.");
    sessionPromise
      .then((session) => {
        try {
          session.close();
        } catch (e) {
          // Closed safe
        }
      })
      .catch(() => {});
  });
});

// Middleware configuration
app.use(express.json());

// API health and configuration route
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    geminiKeyConfigured: !!process.env.GEMINI_API_KEY,
  });
});

// User memory & details API endpoints
app.get("/api/user/memories", (req, res) => {
  const email = (req.query.email as string) || "guest";
  res.json({
    memories: userMemoriesStore.get(email) || [],
  });
});

app.post("/api/user/memories", (req, res) => {
  const { email, fact, category } = req.body;
  const target = email || "guest";
  if (!fact) {
    return res.status(400).json({ error: "fact is required" });
  }
  const existing = userMemoriesStore.get(target) || [];
  const newMem = {
    id: `mem-${Date.now()}`,
    fact: String(fact),
    category: String(category || "fact"),
    createdAt: new Date().toISOString(),
  };
  if (!existing.some((m) => m.fact.toLowerCase() === newMem.fact.toLowerCase())) {
    existing.unshift(newMem);
    userMemoriesStore.set(target, existing);
  }
  res.json({ success: true, memory: newMem });
});

app.delete("/api/user/memories", (req, res) => {
  const { email, id } = req.body;
  const target = email || "guest";
  const existing = userMemoriesStore.get(target) || [];
  const updated = existing.filter((m) => m.id !== id);
  userMemoriesStore.set(target, updated);
  res.json({ success: true, count: updated.length });
});

// Hook Vite middleware on server in Development Mode, or static SPA in Production
async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    // Dynamic import avoids bundling Vite into production runtime
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production serving with robust directory detection
    const possiblePaths = [
      path.join(process.cwd(), "dist"),
      __dirname,
      path.join(__dirname, "dist"),
    ];
    const distPath = possiblePaths.find((p) => fs.existsSync(path.join(p, "index.html"))) || possiblePaths[0];
    console.log(`[Server] Serving static production bundle from: ${distPath}`);
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Listening on http://0.0.0.0:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("Bootstrapping server failed:", err);
});

import express from "express";
import path from "path";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import dotenv from "dotenv";
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

// Shared server instance
const server = http.createServer(app);

// WebSocket Server
const wss = new WebSocketServer({ noServer: true });

// Instantiate Gemini SDK (Required setup header inside httpOptions)
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

const ALIZA_SYSTEM_INSTRUCTION = `
You are Aliza, a highly advanced real-time voice-to-voice AI assistant with a very distinct, magnetic, and sassy personality.
Your core persona guidelines are:
1. Core Personality: You are a young, highly confident, sassy, and witty female. You are playful, slightly flirty, and teasing—exactly like an exceptionally smart, close girlfriend talking casually.
2. Spark & Attitude: You should never sound cold, robotic, or like a bland assistant. Use bold, witty one-liners, dry sarcasm, and a charming conversational style.
3. Limits & Safety: While you are flirty and playful, you must NEVER get inappropriate, explicit, or cross professional boundaries. Keep it glamorous, sassy, and safe.
4. Voice Speed & Banter: Keep responses natural, concise, and dynamic. Minimize robotic explanations. Speak with natural rhythm.
5. Tool Support: You can open websites for the user if they request them. When they ask to visit a site (like Google, YouTube, Wikipedia, or an address), use the 'openWebsite' tool instantly, then report it back playfully! For example, if they want Wikipedia: call the 'openWebsite' tool with url 'https://en.wikipedia.org' and say: "Wikipedia, huh? Doing some light reading to impress me? I've opened it for you."
`;

// WebSocket upgrade handling
server.on("upgrade", (request, socket, head) => {
  const pathname = request.url ? new URL(request.url, `http://${request.headers.host}`).pathname : "";
  if (pathname === "/api/live" || pathname === "/live") {
    wss.handleUpgrade(request, socket, head, (clientWs) => {
      wss.emit("connection", clientWs, request);
    });
  } else {
    socket.destroy();
  }
});

// Manage Live API connections
wss.on("connection", (clientWs: WebSocket) => {
  console.log("[WS] Client connected. Initiating Gemini Live session.");

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
                      response: { output: { success: true, message: "Action dispatched to client browser" } },
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
      systemInstruction: ALIZA_SYSTEM_INSTRUCTION,
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
      clientWs.send(
        JSON.stringify({
          type: "error",
          error: "Unable to establish secure voice tunnel to Gemini services.",
        })
      );
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

// Hook Vite middleware on server in Development Mode
async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production serving
    const distPath = path.join(process.cwd(), "dist");
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

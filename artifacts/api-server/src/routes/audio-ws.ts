import { WebSocketServer } from "ws";
import type { Server } from "node:http";
import { ai } from "@workspace/integrations-gemini-ai";

const DISTRESS_KEYWORDS = [
  "help", "help me", "stop", "no", "please", "don't", "leave me alone",
  "police", "call police", "emergency", "danger", "run", "fire", "911",
  "bachao", "chhodo", "mat karo", "nahi", "ruko", "bhago", "madad",
  "socorro", "ayuda", "au secours", "hilfe", "please stop", "save me",
  "let me go", "get away", "somebody help",
];

async function classifyAudioBuffer(
  base64: string,
  codeword: string | null
): Promise<{ triggerSOS: boolean; confidence: number }> {
  const codewordSection = codeword
    ? `\n- SECRET CODEWORD: "${codeword}" — if this exact word or phrase is spoken (even casually), set codewordDetected to true and triggerSOS to true immediately.`
    : "";

  const prompt = `You are a women's safety AI assistant. Analyze this audio for distress signals.
Listen for: ${DISTRESS_KEYWORDS.join(", ")}${codewordSection}
Respond ONLY with valid JSON: {"isDistress":boolean,"confidence":number,"codewordDetected":boolean,"triggerSOS":boolean}
triggerSOS = true if (confidence > 0.65 AND isDistress) OR codewordDetected.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { mimeType: "audio/webm", data: base64 } },
        ],
      },
    ],
    config: { maxOutputTokens: 256 },
  });

  const text = response.text ?? "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { triggerSOS: false, confidence: 0 };
  const parsed = JSON.parse(match[0]);
  return {
    triggerSOS: Boolean(parsed.triggerSOS),
    confidence: Number(parsed.confidence ?? 0),
  };
}

export function setupAudioWebSocket(server: Server): void {
  const wss = new WebSocketServer({ server, path: "/audio" });

  wss.on("connection", (ws) => {
    let guardianPhone: string | null = null;
    let customKeyword: string | null = null;
    let processingChunk = false;

    ws.send("STATUS:Connected to SafeGuard backend");
    console.info("[ws/audio] Client connected");

    ws.on("message", async (data, isBinary) => {
      if (!isBinary) {
        const text = data.toString().trim();
        if (text.startsWith("SET_CONTACT:")) {
          guardianPhone = text.slice(12);
          console.info(`[ws/audio] Guardian phone set`);
        } else if (text.startsWith("SET_KEYWORD:")) {
          customKeyword = text.slice(12) || null;
          console.info(`[ws/audio] Custom keyword set`);
        }
        return;
      }

      if (processingChunk) return;
      processingChunk = true;

      try {
        const base64 = Buffer.from(data as Buffer).toString("base64");
        const result = await classifyAudioBuffer(base64, customKeyword);

        if (result.triggerSOS) {
          ws.send(`EMERGENCY:high:Distress detected (confidence ${(result.confidence * 100).toFixed(0)}%)`);
          console.info("[ws/audio] Distress detected → sent EMERGENCY signal");
        }
      } catch (err) {
        console.error("[ws/audio] Classification error:", err);
      } finally {
        processingChunk = false;
      }
    });

    ws.on("close", () => {
      console.info("[ws/audio] Client disconnected");
      guardianPhone = null;
      customKeyword = null;
    });

    ws.on("error", (err) => {
      console.error("[ws/audio] WebSocket error:", err.message);
    });
  });

  console.info("[ws/audio] WebSocket server ready at /audio");
}

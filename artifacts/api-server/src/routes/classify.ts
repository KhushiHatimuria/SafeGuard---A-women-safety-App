import { Router } from "express";
import { ai } from "@workspace/integrations-gemini-ai";

const router = Router();

const DISTRESS_KEYWORDS = [
  "help", "help me", "stop", "no", "please", "don't", "leave me alone",
  "police", "call police", "emergency", "danger", "run", "fire", "911",
  "bachao", "chhodo", "mat karo", "nahi", "ruko", "bhago", "madad",
  "socorro", "ayuda", "au secours", "hilfe", "please stop",
];

router.post("/classify/audio", async (req, res) => {
  try {
    const { audioBase64, mimeType, durationSeconds } = req.body;

    if (!audioBase64 || !mimeType) {
      return res.status(400).json({ error: "audioBase64 and mimeType required" });
    }

    // Check size limit - Gemini inline data limit is 8MB
    const sizeBytes = Math.ceil(audioBase64.length * 0.75);
    if (sizeBytes > 7 * 1024 * 1024) {
      return res.status(400).json({ error: "Audio too large, max ~7MB" });
    }

    const prompt = `You are a women's safety AI assistant. Analyze this audio recording for distress signals.

Listen for:
- Distress keywords: ${DISTRESS_KEYWORDS.join(", ")}
- Screaming, crying, elevated fear in voice
- Sounds of struggle, impact, or violence
- Urgent/panicked speech patterns
- Requests for help in any language

Duration: ${durationSeconds ?? "unknown"} seconds

Respond with ONLY valid JSON (no markdown), in this exact format:
{
  "isDistress": boolean,
  "confidence": number between 0 and 1,
  "detectedKeywords": ["keyword1", "keyword2"],
  "reasoning": "brief explanation in 1-2 sentences",
  "triggerSOS": boolean (true if confidence > 0.7 and isDistress is true)
}`;

    let retries = 3;
    let lastError: unknown;
    while (retries > 0) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType,
                    data: audioBase64,
                  },
                },
              ],
            },
          ],
          config: { maxOutputTokens: 8192 },
        });

        const text = response.text ?? "";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON in response");

        const parsed = JSON.parse(jsonMatch[0]);
        return res.json({
          isDistress: Boolean(parsed.isDistress),
          confidence: Number(parsed.confidence ?? 0),
          detectedKeywords: Array.isArray(parsed.detectedKeywords) ? parsed.detectedKeywords : [],
          reasoning: String(parsed.reasoning ?? ""),
          triggerSOS: Boolean(parsed.triggerSOS),
        });
      } catch (err) {
        lastError = err;
        retries--;
        if (retries > 0) await new Promise((r) => setTimeout(r, 1000));
      }
    }

    throw lastError;
  } catch (e) {
    console.error("Audio classification error:", e);
    return res.status(500).json({ error: "Classification failed" });
  }
});

router.post("/classify/text", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "text required" });

    const lowerText = (text as string).toLowerCase();
    const detected = DISTRESS_KEYWORDS.filter((kw) => lowerText.includes(kw.toLowerCase()));
    const isDistress = detected.length > 0;
    const confidence = Math.min(detected.length * 0.25, 1.0);

    return res.json({
      isDistress,
      confidence,
      detectedKeywords: detected,
    });
  } catch (e) {
    return res.status(500).json({ error: "Classification failed" });
  }
});

export default router;

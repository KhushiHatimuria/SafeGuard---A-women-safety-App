// TextBelt — simple REST SMS API (no SDK required)
// Free key "textbelt" = 1 SMS/day per IP (testing only)
// Set TEXTBELT_API_KEY to a paid key for unlimited global SMS
// Purchase at: https://textbelt.com

const TEXTBELT_KEY = process.env.TEXTBELT_API_KEY || "textbelt";
const TEXTBELT_URL = "https://textbelt.com/text";

function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (phone.startsWith("+")) return phone;
  return `+${digits}`;
}

export async function sendSMS(to: string, body: string): Promise<boolean> {
  const normalized = toE164(to);
  try {
    const res = await fetch(TEXTBELT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: normalized, message: body, key: TEXTBELT_KEY }),
    });
    const data = (await res.json()) as { success: boolean; error?: string; quotaRemaining?: number };
    if (data.success) {
      console.info(`[sms] TextBelt sent to ${normalized} — quota remaining: ${data.quotaRemaining}`);
      return true;
    } else {
      console.error(`[sms] TextBelt failed for ${normalized}: ${data.error}`);
      return false;
    }
  } catch (err: any) {
    console.error(`[sms] TextBelt request error: ${err?.message ?? err}`);
    return false;
  }
}

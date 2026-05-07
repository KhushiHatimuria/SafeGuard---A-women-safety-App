// TextBee — open-source Android SMS gateway (https://textbee.dev)
// Uses your own Android phone + SIM as the SMS sender. No per-message fees.
//
// Setup:
//  1. Create account at https://app.textbee.dev
//  2. Install the TextBee Android app and register your device
//  3. Copy your API key and Device ID from the dashboard
//  4. Set TEXTBEE_API_KEY and TEXTBEE_DEVICE_ID as environment secrets

const TEXTBEE_API_KEY = process.env.TEXTBEE_API_KEY ?? "";
const TEXTBEE_DEVICE_ID = process.env.TEXTBEE_DEVICE_ID ?? "";
const TEXTBEE_URL = `https://api.textbee.dev/api/v1/gateway/devices/${TEXTBEE_DEVICE_ID}/send-sms`;

export async function sendSMS(to: string, body: string): Promise<boolean> {
  if (!TEXTBEE_API_KEY || !TEXTBEE_DEVICE_ID) {
    console.warn("[sms] TEXTBEE_API_KEY or TEXTBEE_DEVICE_ID not set — skipping server-side SMS");
    return false;
  }

  try {
    const res = await fetch(TEXTBEE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": TEXTBEE_API_KEY,
      },
      body: JSON.stringify({ receivers: [to], message: body }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[sms] TextBee HTTP ${res.status}: ${text}`);
      return false;
    }

    const data = (await res.json()) as { success?: boolean; message?: string };
    if (data.success !== false) {
      console.info(`[sms] TextBee sent to ${to}`);
      return true;
    } else {
      console.error(`[sms] TextBee failed: ${data.message}`);
      return false;
    }
  } catch (err: any) {
    console.error(`[sms] TextBee request error: ${err?.message ?? err}`);
    return false;
  }
}

import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (phone.startsWith("+")) return `+${digits}`;
  return `+${digits}`;
}

export async function sendSMS(to: string, body: string): Promise<boolean> {
  if (!accountSid || !authToken || !fromNumber) {
    console.warn("[sms] Twilio not configured — set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER");
    return false;
  }
  const normalizedTo = toE164(to);
  try {
    const client = twilio(accountSid, authToken);
    const msg = await client.messages.create({ body, from: fromNumber, to: normalizedTo });
    console.info(`[sms] Sent to ${normalizedTo} — SID: ${msg.sid}`);
    return true;
  } catch (err: any) {
    console.error(`[sms] Failed to send SMS to ${normalizedTo}:`, err?.message ?? err);
    return false;
  }
}

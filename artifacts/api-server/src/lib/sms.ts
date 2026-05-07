import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

export async function sendSMS(to: string, body: string): Promise<boolean> {
  if (!accountSid || !authToken || !fromNumber) {
    console.warn("[sms] Twilio not configured — set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER");
    return false;
  }
  try {
    const client = twilio(accountSid, authToken);
    await client.messages.create({ body, from: fromNumber, to });
    console.info(`[sms] Sent to ${to}`);
    return true;
  } catch (err) {
    console.error("[sms] Failed to send SMS:", err);
    return false;
  }
}

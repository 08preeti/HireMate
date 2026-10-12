import { env } from "../config/env.js";

/** Sends the OTP through Twilio when configured. Returns true if an SMS went out. */
export async function sendOtpSms(phone, otp) {
  const { accountSid, authToken, phoneNumber } = env.twilio;
  if (!accountSid || !authToken || !phoneNumber) return false;

  try {
    // Clean phone - add +91 for India
    const cleanPhone = "+91" + phone.replace(/^(\+91|91|0)/, "").slice(-10);
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const body = new URLSearchParams({
      To: cleanPhone,
      From: phoneNumber,
      Body: `Your HireMate OTP is ${otp}. Valid for 15 minutes. Do not share with anyone. -HireMate`,
    });

    const smsRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
    const smsData = await smsRes.json();

    if (smsData.sid) {
      console.log(`✅ SMS sent to ${cleanPhone} via Twilio`);
      return true;
    }
    console.log("Twilio error:", smsData.message || JSON.stringify(smsData));
  } catch (err) {
    console.log("Twilio failed:", err.message);
  }
  return false;
}

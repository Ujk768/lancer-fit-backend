// Sends OS-level push notifications through Expo's push service. This is the
// bridge between backend events and a banner on the phone even when the app is
// backgrounded or closed. The mobile app registers its Expo push token via
// POST /api/push/register; here we look those tokens up for a set of recipients
// and POST them to Expo's HTTPS endpoint in chunks.
//
// No SDK dependency — a plain fetch to https://exp.host/--/api/v2/push/send
// keeps the footprint tiny. Failures are swallowed and logged so a push outage
// never breaks the REST response that triggered it.

import { PushToken } from "../models/PushToken";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

// Expo accepts up to 100 messages per request; chunk to be safe.
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function deliver(tokens: string[], message: PushMessage): Promise<void> {
  const valid = tokens.filter((t) => typeof t === "string" && t.startsWith("ExponentPushToken"));
  if (valid.length === 0) return;

  for (const group of chunk(valid, 100)) {
    const messages = group.map((to) => ({
      to,
      sound: "default",
      title: message.title,
      body: message.body,
      data: message.data ?? {},
      priority: "high",
    }));
    try {
      await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messages),
      });
    } catch (err) {
      // Never let a push failure bubble into the request that triggered it.
      console.error("[push] delivery failed:", (err as Error)?.message);
    }
  }
}

async function tokensForOwners(ownerRole: string, ownerIds?: number[]): Promise<string[]> {
  const where: Record<string, unknown> = { ownerRole };
  if (ownerIds && ownerIds.length > 0) where.ownerId = ownerIds;
  const rows = await PushToken.findAll({ where });
  return rows.map((r) => r.token);
}

export const push = {
  // Notify every admin device (e.g. a new validation needs review).
  async toAllAdmins(message: PushMessage): Promise<void> {
    const tokens = await tokensForOwners("admin");
    await deliver(tokens, message);
  },

  // Notify every student device (e.g. a new challenge just dropped).
  async toAllStudents(message: PushMessage): Promise<void> {
    const tokens = await tokensForOwners("student");
    await deliver(tokens, message);
  },

  // Notify one specific user's devices (e.g. your result was approved).
  async toUser(userId: number, message: PushMessage): Promise<void> {
    const tokens = await tokensForOwners("student", [userId]);
    await deliver(tokens, message);
  },
};
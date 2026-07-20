import crypto from "crypto";
/**
 * Generates numeric verification code.
 * Example: 483921
 */
export function generateOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

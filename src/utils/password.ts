// src/utils/password.ts
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;
// higher = slower to hash = harder to brute force
// 12 is a good balance for most apps

export const hashPassword = async (plainText: string): Promise<string> => {
  return bcrypt.hash(plainText, SALT_ROUNDS);
};

export const verifyPassword = async (
  plainText: string,
  hashed: string
): Promise<boolean> => {
  return bcrypt.compare(plainText, hashed);
};
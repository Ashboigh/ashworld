import crypto from "crypto";
import bcrypt from "bcryptjs";

const BACKUP_CODE_COUNT = parseInt(process.env.MFA_BACKUP_CODES_COUNT || "8", 10);
const BACKUP_CODE_LENGTH = 8;

/**
 * Generate a single backup code (8 alphanumeric characters)
 */
function generateSingleBackupCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude confusing chars (0, O, 1, I)
  let code = "";
  const randomBytes = Array.from(crypto.randomBytes(BACKUP_CODE_LENGTH));
  for (let i = 0; i < BACKUP_CODE_LENGTH; i++) {
    const byte = randomBytes[i];
    if (byte !== undefined) {
      code += chars[byte % chars.length];
    }
  }
  // Format as XXXX-XXXX for readability
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

/**
 * Generate a set of backup codes
 */
export function generateBackupCodes(count: number = BACKUP_CODE_COUNT): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    codes.push(generateSingleBackupCode());
  }
  return codes;
}

/**
 * Hash a backup code for storage
 */
export async function hashBackupCode(code: string): Promise<string> {
  // Normalize the code (remove dashes, uppercase)
  const normalizedCode = code.replace(/-/g, "").toUpperCase();
  return bcrypt.hash(normalizedCode, 10);
}

/**
 * Verify a backup code against its hash
 */
export async function verifyBackupCode(code: string, hash: string): Promise<boolean> {
  // Normalize the code (remove dashes, uppercase)
  const normalizedCode = code.replace(/-/g, "").toUpperCase();
  return bcrypt.compare(normalizedCode, hash);
}

/**
 * Generate backup codes and their hashes for storage
 */
export async function generateBackupCodesWithHashes(count: number = BACKUP_CODE_COUNT): Promise<{
  codes: string[];
  hashedCodes: string[];
}> {
  const codes = generateBackupCodes(count);
  const hashedCodes = await Promise.all(codes.map((code) => hashBackupCode(code)));
  return { codes, hashedCodes };
}

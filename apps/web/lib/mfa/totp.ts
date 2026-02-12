import crypto from "crypto";
import QRCode from "qrcode";

// TOTP configuration
const TOTP_DIGITS = 6;
const TOTP_PERIOD = 30;
const TOTP_WINDOW = 1;
const SECRET_LENGTH = 20; // 160 bits

const APP_NAME = process.env.TOTP_ISSUER || "EnterpriseChatbot";

// Base32 alphabet (RFC 4648)
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Encode bytes to Base32
 */
function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  const bytes = Array.from(buffer);

  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    if (byte === undefined) continue;
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Decode Base32 to bytes
 */
function base32Decode(str: string): Buffer {
  const cleanStr = str.toUpperCase().replace(/[^A-Z2-7]/g, "");
  const output: number[] = [];
  let bits = 0;
  let value = 0;
  const chars = cleanStr.split("");

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    if (!char) continue;
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) continue;

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}

/**
 * Generate HMAC-based OTP
 */
function generateHOTP(secret: Buffer, counter: bigint): string {
  // Convert counter to 8-byte buffer (big-endian)
  const counterBuffer = Buffer.alloc(8);
  for (let i = 7; i >= 0; i--) {
    counterBuffer[i] = Number(counter & BigInt(0xff));
    counter = counter >> BigInt(8);
  }

  // Generate HMAC-SHA1
  const hmac = crypto.createHmac("sha1", secret);
  hmac.update(counterBuffer);
  const hash = Array.from(hmac.digest());

  // Dynamic truncation
  const lastByte = hash[hash.length - 1] ?? 0;
  const offset = lastByte & 0xf;
  const binary =
    (((hash[offset] ?? 0) & 0x7f) << 24) |
    (((hash[offset + 1] ?? 0) & 0xff) << 16) |
    (((hash[offset + 2] ?? 0) & 0xff) << 8) |
    ((hash[offset + 3] ?? 0) & 0xff);

  // Generate OTP
  const otp = binary % Math.pow(10, TOTP_DIGITS);
  return otp.toString().padStart(TOTP_DIGITS, "0");
}

/**
 * Generate time-based OTP
 */
function generateTOTP(secret: Buffer, time?: number): string {
  const timestamp = time ?? Math.floor(Date.now() / 1000);
  const counter = BigInt(Math.floor(timestamp / TOTP_PERIOD));
  return generateHOTP(secret, counter);
}

/**
 * Generate a new TOTP secret for a user
 */
export function generateTOTPSecret(): string {
  const buffer = crypto.randomBytes(SECRET_LENGTH);
  return base32Encode(buffer);
}

/**
 * Generate a TOTP URI for QR code scanning
 */
export function generateTOTPKeyUri(userEmail: string, secret: string): string {
  const encodedIssuer = encodeURIComponent(APP_NAME);
  const encodedEmail = encodeURIComponent(userEmail);
  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`;
}

/**
 * Generate a QR code data URL for the TOTP URI
 */
export async function generateQRCodeDataURL(otpauthUri: string): Promise<string> {
  return QRCode.toDataURL(otpauthUri, {
    width: 256,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });
}

/**
 * Verify a TOTP token against a secret
 */
export function verifyTOTPToken(token: string, secret: string): boolean {
  try {
    const secretBuffer = base32Decode(secret);
    const now = Math.floor(Date.now() / 1000);

    // Check current and adjacent time windows
    for (let i = -TOTP_WINDOW; i <= TOTP_WINDOW; i++) {
      const checkTime = now + i * TOTP_PERIOD;
      const expectedToken = generateTOTP(secretBuffer, checkTime);
      if (token === expectedToken) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Generate a setup payload for MFA enrollment
 * Returns the secret, QR code, and backup URI
 */
export async function generateMFASetupPayload(userEmail: string): Promise<{
  secret: string;
  qrCodeDataUrl: string;
  otpauthUri: string;
}> {
  const secret = generateTOTPSecret();
  const otpauthUri = generateTOTPKeyUri(userEmail, secret);
  const qrCodeDataUrl = await generateQRCodeDataURL(otpauthUri);

  return {
    secret,
    qrCodeDataUrl,
    otpauthUri,
  };
}

/**
 * Get the current TOTP token for a secret (for testing purposes)
 */
export function getCurrentTOTP(secret: string): string {
  const secretBuffer = base32Decode(secret);
  return generateTOTP(secretBuffer);
}

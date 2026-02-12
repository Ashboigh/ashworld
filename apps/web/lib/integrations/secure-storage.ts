import crypto from "crypto";

const SECRET =
  process.env.INTEGRATION_CREDENTIAL_SECRET ??
  process.env.NEXTAUTH_SECRET ??
  process.env.NEXT_PUBLIC_INTEGRATION_SECRET;

const ALGORITHM = "aes-256-gcm";

if (!SECRET) {
  throw new Error(
    "INTEGRATION_CREDENTIAL_SECRET (or NEXTAUTH_SECRET) must be set to secure integration credentials."
  );
}

const KEY = crypto.createHash("sha256").update(SECRET).digest();

export function encryptCredential(payload: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(payload, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${encrypted.toString("base64")}.${tag.toString(
    "base64"
  )}`;
}

export function decryptCredential(encryptedPayload: string): string {
  const [ivPart, encryptedPart, tagPart] = encryptedPayload.split(".");
  if (!ivPart || !encryptedPart || !tagPart) {
    throw new Error("Malformed credential payload");
  }

  const iv = Buffer.from(ivPart, "base64");
  const encrypted = Buffer.from(encryptedPart, "base64");
  const tag = Buffer.from(tagPart, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

  return decrypted.toString("utf8");
}

import crypto from "crypto";

const PII_PATTERNS = {
  email: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  phone: /\b(?:\+?\d{1,3})?[\s.-]?(?:\(\d{2,4}\)|\d{2,4})[\s.-]?\d{3,4}[\s.-]?\d{3,4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  creditCard: /\b(?:\d[ -]*?){13,16}\b/g,
};

const DATA_KEY = Buffer.from(
  process.env.DATA_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || "default-secret-32-bytes-000",
  "utf8"
).slice(0, 32);

export function detectPII(input: string) {
  const hits: Array<{ type: string; match: string }> = [];
  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    let match;
    while ((match = pattern.exec(input)) !== null) {
      hits.push({ type, match: match[0] });
    }
  }
  return hits;
}

export function redactPII(input: string, replace = "[REDACTED]") {
  let redacted = input;
  for (const pattern of Object.values(PII_PATTERNS)) {
    redacted = redacted.replace(pattern, replace);
  }
  return redacted;
}

export function encryptToken(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", DATA_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${encrypted.toString("base64")}.${tag.toString("base64")}`;
}

export function decryptToken(value: string) {
  const [ivPart, encryptedPart, tagPart] = value.split(".");
  if (!ivPart || !encryptedPart || !tagPart) {
    throw new Error("Malformed encrypted token");
  }
  const iv = Buffer.from(ivPart, "base64");
  const encrypted = Buffer.from(encryptedPart, "base64");
  const tag = Buffer.from(tagPart, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", DATA_KEY, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

export function scheduleRetentionJob(resources: string[], retentionDays: number) {
  return {
    job: "data-retention",
    resources,
    retentionDays,
    nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

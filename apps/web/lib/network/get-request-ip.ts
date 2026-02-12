import type { IncomingHttpHeaders } from "http";

type HeaderLike = IncomingHttpHeaders | Headers;

function getHeaderValue(headers: HeaderLike, key: string): string | null {
  if ("get" in headers) {
    return headers.get(key);
  }

  const lowerKey = key.toLowerCase();
  const value = headers[lowerKey];

  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

export function getRequestIp(headers: HeaderLike): string | null {
  const forwarded = getHeaderValue(headers, "x-forwarded-for");
  if (forwarded) {
    const [first] = forwarded.split(",");
    if (first?.trim()) {
      return first.trim();
    }
  }

  const realIp = getHeaderValue(headers, "x-real-ip");
  if (realIp) {
    return realIp;
  }

  const cfIp = getHeaderValue(headers, "cf-connecting-ip");
  if (cfIp) {
    return cfIp;
  }

  const remoteAddr = getHeaderValue(headers, "remote-addr") ?? getHeaderValue(headers, "remote-address");
  if (remoteAddr) {
    return remoteAddr;
  }

  return null;
}

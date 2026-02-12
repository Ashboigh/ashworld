const APP_BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";
const APP_BASE_ORIGIN = new URL(APP_BASE_URL).origin;

export function sanitizeRedirectUrl(value?: string | null) {
  if (!value) return "/";
  try {
    const parsed = new URL(value, APP_BASE_URL);
    if (parsed.origin !== APP_BASE_ORIGIN) {
      return "/";
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/";
  }
}

export function getReturnUrlCookie(orgId: string) {
  return `sso_return_url_${orgId}`;
}

export function getOIDCStateCookie(orgId: string) {
  return `sso_oidc_state_${orgId}`;
}

export function getOIDCNonceCookie(orgId: string) {
  return `sso_oidc_nonce_${orgId}`;
}

export function isDomainAllowed(email: string, allowedDomains: string[]) {
  if (allowedDomains.length === 0) {
    return true;
  }

  const domain = email.split("@").at(1)?.toLowerCase();
  if (!domain) {
    return false;
  }

  const normalized = allowedDomains.map((entry) =>
    entry.replace(/^@/, "").trim().toLowerCase()
  );

  return normalized.some(
    (allowedDomain) =>
      domain === allowedDomain || domain.endsWith(`.${allowedDomain}`)
  );
}

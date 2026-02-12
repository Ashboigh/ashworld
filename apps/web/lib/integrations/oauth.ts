import { stringify } from "querystring";

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  [key: string]: unknown;
}

export interface RefreshOAuthTokenParams {
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  scope?: string | string[];
  extra?: Record<string, string>;
}

export async function refreshOAuthToken(
  params: RefreshOAuthTokenParams
): Promise<OAuthTokenResponse> {
  const body = {
    grant_type: "refresh_token",
    client_id: params.clientId,
    client_secret: params.clientSecret,
    refresh_token: params.refreshToken,
    ...params.extra,
  };

  if (params.scope) {
    body.scope = Array.isArray(params.scope) ? params.scope.join(" ") : params.scope;
  }

  const response = await fetch(params.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: stringify(body),
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(
      `Failed to refresh OAuth token (${response.status}): ${payload}`
    );
  }

  return response.json();
}

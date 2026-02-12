const PAYSTACK_BASE_URL = "https://api.paystack.co";

function getSecretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    throw new Error("PAYSTACK_SECRET_KEY is not set in environment variables");
  }
  return key;
}

function headers(): HeadersInit {
  return {
    Authorization: `Bearer ${getSecretKey()}`,
    "Content-Type": "application/json",
  };
}

export async function paystackGet<T = unknown>(path: string): Promise<T> {
  const res = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    method: "GET",
    headers: headers(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || `Paystack GET ${path} failed: ${res.status}`);
  }
  return data as T;
}

export async function paystackPost<T = unknown>(
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const res = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    method: "POST",
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || `Paystack POST ${path} failed: ${res.status}`);
  }
  return data as T;
}

export async function paystackPut<T = unknown>(
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const res = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    method: "PUT",
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || `Paystack PUT ${path} failed: ${res.status}`);
  }
  return data as T;
}

export const PAYSTACK_WEBHOOK_SECRET = process.env.PAYSTACK_SECRET_KEY || "";

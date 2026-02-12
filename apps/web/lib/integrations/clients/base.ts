/**
 * Base Integration Client
 * Provides common functionality for all integration API clients
 */

import { getValidAccessToken, refreshAccessToken } from "../oauth-flow";

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total?: number;
  hasMore: boolean;
  cursor?: string;
  nextPage?: string;
}

export abstract class BaseIntegrationClient {
  protected credentialId: string;
  protected baseUrl: string;
  private accessToken: string | null = null;

  constructor(credentialId: string, baseUrl: string) {
    this.credentialId = credentialId;
    this.baseUrl = baseUrl;
  }

  /**
   * Make an authenticated API request
   */
  protected async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const token = await this.getToken();
    if (!token) {
      return {
        success: false,
        error: "Failed to get access token",
        statusCode: 401,
      };
    }

    const url = this.buildUrl(endpoint, options.params);
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        method: options.method || "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      // Handle 401 - try to refresh token and retry
      if (response.status === 401) {
        const refreshResult = await refreshAccessToken(this.credentialId);
        if (refreshResult.success && refreshResult.accessToken) {
          this.accessToken = refreshResult.accessToken;
          // Retry the request with new token
          return this.request(endpoint, options);
        }
        return {
          success: false,
          error: "Authentication failed",
          statusCode: 401,
        };
      }

      // Handle other errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: this.extractErrorMessage(errorData) || `HTTP ${response.status}`,
          statusCode: response.status,
        };
      }

      // Handle no content
      if (response.status === 204) {
        return { success: true };
      }

      const data = await response.json();
      return {
        success: true,
        data: data as T,
        statusCode: response.status,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Request failed",
      };
    }
  }

  /**
   * Make a GET request
   */
  protected async get<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "GET", params });
  }

  /**
   * Make a POST request
   */
  protected async post<T>(
    endpoint: string,
    body?: unknown,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "POST", body, params });
  }

  /**
   * Make a PUT request
   */
  protected async put<T>(
    endpoint: string,
    body?: unknown
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "PUT", body });
  }

  /**
   * Make a PATCH request
   */
  protected async patch<T>(
    endpoint: string,
    body?: unknown
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "PATCH", body });
  }

  /**
   * Make a DELETE request
   */
  protected async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }

  /**
   * Get access token, refreshing if necessary
   */
  private async getToken(): Promise<string | null> {
    if (this.accessToken) {
      return this.accessToken;
    }

    this.accessToken = await getValidAccessToken(this.credentialId);
    return this.accessToken;
  }

  /**
   * Build full URL with query parameters
   */
  private buildUrl(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>
  ): string {
    const url = new URL(endpoint.startsWith("http") ? endpoint : `${this.baseUrl}${endpoint}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    return url.toString();
  }

  /**
   * Extract error message from API response
   * Override in subclasses for provider-specific error handling
   */
  protected extractErrorMessage(errorData: unknown): string | null {
    if (typeof errorData === "object" && errorData !== null) {
      const data = errorData as Record<string, unknown>;
      return (
        (data.message as string) ||
        (data.error as string) ||
        (data.error_description as string) ||
        null
      );
    }
    return null;
  }

  /**
   * Abstract method for testing the connection
   */
  abstract testConnection(): Promise<boolean>;
}

/**
 * Rate limiter for API requests
 */
export class RateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async throttle(): Promise<void> {
    const now = Date.now();
    this.requests = this.requests.filter((time) => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.requests.push(Date.now());
  }
}

/**
 * Retry wrapper for transient failures
 */
export async function withRetry<T>(
  fn: () => Promise<ApiResponse<T>>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<ApiResponse<T>> {
  let lastError: ApiResponse<T> | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await fn();

    if (result.success) {
      return result;
    }

    // Don't retry client errors (4xx)
    if (result.statusCode && result.statusCode >= 400 && result.statusCode < 500) {
      return result;
    }

    lastError = result;

    // Wait before retrying with exponential backoff
    if (attempt < maxRetries - 1) {
      await new Promise((resolve) =>
        setTimeout(resolve, delayMs * Math.pow(2, attempt))
      );
    }
  }

  return lastError || { success: false, error: "Max retries exceeded" };
}

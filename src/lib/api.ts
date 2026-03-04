import { tailscaleApiKey, tailscaleTailnet } from "./storage";

const TAILSCALE_API_BASE = "https://api.tailscale.com/api/v2";

/**
 * Validates that an API key has the correct format
 */
export function isValidApiKeyFormat(key: string): boolean {
  return key.startsWith("tskey-api-");
}

/**
 * Tailscale API client
 */
export class TailscaleAPI {
  private apiKey: string;
  private tailnet: string;

  constructor(apiKey: string, tailnet: string = "-") {
    this.apiKey = apiKey;
    this.tailnet = tailnet;
  }

  /**
   * Make an authenticated request to the Tailscale API
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${TAILSCALE_API_BASE}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tailscale API error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  /**
   * List all devices in the tailnet
   */
  async listDevices(fields: "all" | "default" = "default") {
    return this.request<{ devices: any[] }>(`/tailnet/${this.tailnet}/devices?fields=${fields}`);
  }

  /**
   * Test API connection by fetching devices
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.listDevices("default");
      return true;
    } catch (error) {
      console.error("Tailscale API connection test failed:", error);
      return false;
    }
  }
}

/**
 * Create a Tailscale API client from stored credentials
 */
export async function createTailscaleClient(): Promise<TailscaleAPI | null> {
  const apiKey = await tailscaleApiKey.getValue();
  const tailnet = await tailscaleTailnet.getValue();

  if (!apiKey || !isValidApiKeyFormat(apiKey)) {
    return null;
  }

  return new TailscaleAPI(apiKey, tailnet);
}

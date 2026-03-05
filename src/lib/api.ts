import { tailscaleApiKey, tailscaleTailnet } from "./storage";

const TAILSCALE_API_BASE = "https://api.tailscale.com/api/v2";

/**
 * Network connectivity status
 */
export enum ConnectivityStatus {
  /**
   * API key not configured
   */
  NotConfigured = "not-configured",
  /**
   * Connected and authenticated
   */
  Connected = "connected",
  /**
   * DNS resolution failed - likely no internet or network issue
   */
  NetworkError = "network-error",
  /**
   * Authentication failed - invalid or expired API key
   */
  AuthenticationFailed = "auth-failed",
  /**
   * API returned an error
   */
  ApiError = "api-error",
  /**
   * Unknown error
   */
  Unknown = "unknown",
}

/**
 * Connectivity check result
 */
export interface ConnectivityCheckResult {
  status: ConnectivityStatus;
  message: string;
  isConnected: boolean;
}

/**
 * Tailscale Device type
 */
export interface Device {
  id: string;
  nodeId: string;
  user: string;
  name: string;
  hostname: string;
  clientVersion: string;
  updateAvailable: boolean;
  os: string;
  created: string;
  connectedToControl: boolean;
  lastSeen: string;
  keyExpiryDisabled: boolean;
  expires: string;
  authorized: boolean;
  isExternal: boolean;
  addresses: string[];
  tags?: string[];
  distro?: {
    name: string;
    version: string;
    codeName: string;
  };
  [key: string]: any;
}

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
    return this.request<{ devices: Device[] }>(`/tailnet/${this.tailnet}/devices?fields=${fields}`);
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

  /**
   * Detailed connectivity check
   */
  async checkConnectivity(): Promise<ConnectivityCheckResult> {
    try {
      await this.listDevices("default");
      return {
        status: ConnectivityStatus.Connected,
        message: "Successfully connected to Tailscale API",
        isConnected: true,
      };
    } catch (error) {
      return this.analyzeError(error);
    }
  }

  /**
   * Analyze error and return appropriate connectivity status
   */
  private analyzeError(error: unknown): ConnectivityCheckResult {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Network/DNS errors
    if (errorMessage.includes("Failed to fetch") || errorMessage.includes("NetworkError") || errorMessage.includes("TypeError")) {
      return {
        status: ConnectivityStatus.NetworkError,
        message: "Network error: Unable to reach api.tailscale.com. Check your internet connection or network settings.",
        isConnected: false,
      };
    }

    // Authentication errors
    if (errorMessage.includes("401") || errorMessage.includes("403")) {
      return {
        status: ConnectivityStatus.AuthenticationFailed,
        message: "Authentication failed: Your API key may be invalid or expired. Please check your settings.",
        isConnected: false,
      };
    }

    // API errors (but successfully reached the API)
    if (errorMessage.includes("Tailscale API error")) {
      return {
        status: ConnectivityStatus.ApiError,
        message: `API Error: ${errorMessage}`,
        isConnected: false,
      };
    }

    // Unknown error
    return {
      status: ConnectivityStatus.Unknown,
      message: `Unknown error: ${errorMessage}`,
      isConnected: false,
    };
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

/**
 * Check browser connectivity to Tailscale API
 * This performs a detailed connectivity check and returns status information
 */
export async function checkBrowserConnectivity(): Promise<ConnectivityCheckResult> {
  const apiKey = await tailscaleApiKey.getValue();

  if (!apiKey) {
    return {
      status: ConnectivityStatus.NotConfigured,
      message: "API key not configured. Please configure your Tailscale API key in settings.",
      isConnected: false,
    };
  }

  if (!isValidApiKeyFormat(apiKey)) {
    return {
      status: ConnectivityStatus.AuthenticationFailed,
      message: "Invalid API key format. API keys should start with 'tskey-api-'.",
      isConnected: false,
    };
  }

  const client = new TailscaleAPI(apiKey, await tailscaleTailnet.getValue());
  return client.checkConnectivity();
}

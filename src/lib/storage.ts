import { storage } from "#imports";

export type DeviceReachabilityStatus = "reachable" | "unreachable" | "unknown";

export interface DeviceReachabilityResult {
  status: DeviceReachabilityStatus;
  checkedAt: string;
  target?: string;
  detail?: string;
}

export type DeviceReachabilityMap = Record<string, DeviceReachabilityResult>;

/**
 * Theme preference (light or dark)
 */
export const themePreference = storage.defineItem<"light" | "dark" | "system">("local:themePreference", {
  defaultValue: "system",
});

/**
 * Tailscale API key storage
 * Format: tskey-api-xxxxx
 */
export const tailscaleApiKey = storage.defineItem<string>("local:tailscaleApiKey", {
  defaultValue: "",
});

/**
 * Tailnet identifier (optional, defaults to "-" for user's default tailnet)
 */
export const tailscaleTailnet = storage.defineItem<string>("local:tailscaleTailnet", {
  defaultValue: "-",
});

/**
 * Latest per-device reachability scan results.
 */
export const deviceReachability = storage.defineItem<DeviceReachabilityMap>("local:deviceReachability", {
  defaultValue: {},
});

/**
 * Timestamp of the latest global reachability scan.
 */
export const deviceReachabilityLastScan = storage.defineItem<string | null>("local:deviceReachabilityLastScan", {
  defaultValue: null,
});

import { storage } from "#imports";

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

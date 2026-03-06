<script lang="ts">
  import { onMount } from "svelte";
  import { createTailscaleClient, checkBrowserConnectivity, ConnectivityStatus } from "../lib/api";
  import type { Device, ConnectivityCheckResult } from "../lib/api";
  import { deviceReachability, deviceReachabilityLastScan, type DeviceReachabilityMap } from "../lib/storage";
  import { navigate } from "../entrypoints/tab/router";
  import { getCachedLocalIPs } from "../lib/localIp";

  let devices = $state<Device[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let errorDetails = $state<ConnectivityCheckResult | null>(null);
  let refreshing = $state(false);
  let reachability = $state<DeviceReachabilityMap>({});
  let lastReachabilityScan = $state<string | null>(null);
  let localIPs = $state<string[]>([]);
  let currentDeviceId = $state<string | null>(null);

  async function loadDevices() {
    loading = true;
    error = null;
    errorDetails = null;

    try {
      // First check connectivity
      const connectivityCheck = await checkBrowserConnectivity();

      if (!connectivityCheck.isConnected) {
        error = connectivityCheck.message;
        errorDetails = connectivityCheck;
        loading = false;
        return;
      }

      // If connected, fetch devices
      const client = await createTailscaleClient();
      if (!client) {
        error = "Failed to create API client";
        loading = false;
        return;
      }

      const result = await client.listDevices("all");
      devices = result.devices || [];

      // Identify current device if we already have local IPs
      if (localIPs.length > 0) {
        currentDeviceId = findCurrentDevice(devices, localIPs);
      }

      // Auto-redirect to services if no devices but services exist
      if (devices.length === 0) {
        try {
          const servicesResult = await client.listServices();
          if (servicesResult.vipServices && servicesResult.vipServices.length > 0) {
            navigate("/tab.html/services");
            return;
          }
        } catch (servicesErr) {
          // Silently fail the redirect check - stay on devices view
          console.debug("Could not check services for auto-redirect:", servicesErr);
        }
      }
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to load devices";
      console.error("Error loading devices:", err);
    } finally {
      loading = false;
    }
  }

  async function refreshDevices() {
    refreshing = true;
    await loadDevices();
    await loadReachability();
    refreshing = false;
  }

  async function loadReachability() {
    reachability = await deviceReachability.getValue();
    lastReachabilityScan = await deviceReachabilityLastScan.getValue();
  }

  function getReachabilityLabel(deviceId: string): string {
    const result = reachability[deviceId];
    if (!result) return "Unknown";

    if (result.status === "reachable") return "Reachable";
    if (result.status === "unreachable") return "Unreachable";
    return "Unknown";
  }

  function getReachabilityColor(deviceId: string): string {
    const result = reachability[deviceId];
    if (!result) return "var(--status-pending)";

    if (result.status === "reachable") return "var(--status-connected)";
    if (result.status === "unreachable") return "var(--status-disconnected)";
    return "var(--status-pending)";
  }

  function formatRelativeTime(isoTime: string | null): string {
    if (!isoTime) return "Never";
    const now = Date.now();
    const then = new Date(isoTime).getTime();
    const seconds = Math.max(0, Math.floor((now - then) / 1000));

    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }

  onMount(() => {
    void loadDevices();
    void loadReachability();
    void loadLocalIPs();

    const intervalId = window.setInterval(() => {
      void loadReachability();
    }, 15000);

    // Listen for device connection notifications from background script
    const messageListener = (message: any) => {
      if (message.type === "DEVICE_CONNECTED_TO_TAILNET") {
        console.log("Device connected to tailnet notification received, refreshing devices");
        void loadDevices();
        void loadReachability();
      } else if (message.type === "TAILNET_CONNECTION_CHANGED") {
        if (message.connected) {
          console.log("Device connected to tailnet, refreshing devices");
        } else {
          console.log("Device disconnected from tailnet, refreshing devices");
        }
        void loadDevices();
        void loadReachability();
      }
    };

    browser.runtime.onMessage.addListener(messageListener);

    return () => {
      window.clearInterval(intervalId);
      browser.runtime.onMessage.removeListener(messageListener);
    };
  });

  async function loadLocalIPs() {
    try {
      localIPs = await getCachedLocalIPs();
      // Identify the current device after loading local IPs
      currentDeviceId = findCurrentDevice(devices, localIPs);
    } catch (error) {
      console.error("Failed to load local IPs:", error);
    }
  }

  function getStatusColor(connected: boolean, authorized: boolean): string {
    if (!authorized) return "var(--status-pending)";
    return connected ? "var(--status-connected)" : "var(--status-disconnected)";
  }

  function getStatusLabel(connected: boolean, authorized: boolean): string {
    if (!authorized) return "Pending";
    return connected ? "Connected" : "Disconnected";
  }

  function getOS(device: Device): string {
    if (device.distro?.name) {
      return device.distro.name.charAt(0).toUpperCase() + device.distro.name.slice(1);
    }
    return device.os?.toUpperCase() || "Unknown";
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function findCurrentDevice(devicesArr: Device[], localIpList: string[]): string | null {
    if (localIpList.length === 0) return null;

    for (const device of devicesArr) {
      if (!device.addresses) continue;
      // Check if any of this device's addresses match any of our local IPs
      for (const deviceIp of device.addresses) {
        if (localIpList.includes(deviceIp)) {
          return device.id;
        }
      }
    }
    return null;
  }

  function isCurrentDevice(deviceId: string): boolean {
    return deviceId === currentDeviceId;
  }

  function getSortedDevices(devicesArr: Device[], currDeviceId: string | null): Device[] {
    if (!currDeviceId) return devicesArr;

    const current = devicesArr.find((d) => d.id === currDeviceId);
    const others = devicesArr.filter((d) => d.id !== currDeviceId);

    if (current) {
      return [current, ...others];
    }
    return devicesArr;
  }
</script>

<div class="devices-container">
  <div class="devices-header">
    <div class="devices-title-group">
      <h2>Devices ({devices.length})</h2>
      <p class="scan-meta">Reachability scan: {formatRelativeTime(lastReachabilityScan)}</p>
    </div>
    <button class="refresh-btn" onclick={refreshDevices} disabled={refreshing || loading}>
      {refreshing ? "Refreshing..." : "Refresh"}
    </button>
  </div>

  {#if loading}
    <div class="loading">
      <p>Loading devices...</p>
    </div>
  {:else if error}
    <div class="error">
      <p>{error}</p>
      {#if errorDetails}
        <div class="error-details">
          <span class="error-status">{errorDetails.status}</span>
          {#if errorDetails.status === ConnectivityStatus.NetworkError}
            <div class="error-hint">This usually means you're not connected to the internet or have network connectivity issues.</div>
          {:else if errorDetails.status === ConnectivityStatus.AuthenticationFailed}
            <div class="error-hint">Check your API key in settings. You can create a new one in the Tailscale admin console.</div>
          {/if}
        </div>
      {/if}
      <button class="btn-retry" onclick={loadDevices}> Retry </button>
    </div>
  {:else if devices.length === 0}
    <div class="empty-state">
      <p>No devices found in your tailnet.</p>
    </div>
  {:else}
    <div class="devices-list">
      {#each getSortedDevices(devices, currentDeviceId) as device (device.id)}
        <div class="device-card" class:current-device={isCurrentDevice(device.id)}>
          <div class="device-header">
            <div class="device-name-section">
              {#if isCurrentDevice(device.id)}
                <span class="current-device-badge">This Device</span>
              {/if}
              <h3 class="device-name">{device.hostname}</h3>
              <p class="device-fqdn">{device.name}</p>
            </div>
            <div class="device-status" style="--status-color: {getStatusColor(device.connectedToControl, device.authorized)}">
              <span class="status-dot"></span>
              <span class="status-label">{getStatusLabel(device.connectedToControl, device.authorized)}</span>
            </div>
          </div>

          <div class="device-details">
            <div class="detail-row">
              <span class="detail-label">IP Address</span>
              <span class="detail-value">{device.addresses?.[0] || "N/A"}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">OS</span>
              <span class="detail-value">{getOS(device)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">User</span>
              <span class="detail-value">{device.user || "N/A"}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Last Seen</span>
              <span class="detail-value">{formatDate(device.lastSeen)}</span>
            </div>
            {#if device.clientVersion}
              <div class="detail-row">
                <span class="detail-label">Version</span>
                <span class="detail-value">{device.clientVersion}</span>
              </div>
            {/if}
            <div class="detail-row">
              <span class="detail-label">Reachability</span>
              <span class="detail-value reachability-value" style="--reachability-color: {getReachabilityColor(device.id)}">
                {getReachabilityLabel(device.id)}
              </span>
            </div>
            {#if device.tags && device.tags.length > 0}
              <div class="detail-row">
                <span class="detail-label">Tags</span>
                <div class="tags">
                  {#each device.tags as tag}
                    <span class="tag">{tag}</span>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  :global([data-theme="light"]) {
    --bg-primary: #ffffff;
    --bg-secondary: #f5f5f5;
    --text-primary: #000000;
    --text-secondary: #666666;
    --border-color: #dddddd;
    --status-connected: green;
    --status-disconnected: brown;
    --status-pending: #999999;
  }

  :global([data-theme="dark"]) {
    --bg-primary: #1a1a1a;
    --bg-secondary: #2d2d2d;
    --text-primary: #ffffff;
    --text-secondary: #b0b0b0;
    --border-color: #444444;
    --status-connected: green;
    --status-disconnected: brown;
    --status-pending: #888888;
  }

  .devices-container {
    width: 100%;
    padding: 1rem;
    overflow-y: auto;
    flex: 1;
  }

  .local-ip-section {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    padding: 1rem;
    margin-bottom: 1rem;
  }

  .local-ip-label {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--text-secondary);
    margin-bottom: 0.5rem;
    letter-spacing: 0.5px;
  }

  .local-ip-addresses {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .ip-badge {
    background: var(--bg-primary);
    color: var(--text-primary);
    padding: 0.4rem 0.75rem;
    border-radius: 4px;
    font-family: monospace;
    font-size: 0.9rem;
    border: 1px solid var(--border-color);
    user-select: all;
  }

  .ip-badge:hover {
    cursor: pointer;
    opacity: 0.8;
  }

  .ip-empty {
    color: var(--text-secondary);
    font-style: italic;
  }

  .devices-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    color: var(--text-primary);
  }

  .devices-title-group {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .scan-meta {
    margin: 0;
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .devices-header h2 {
    margin: 0;
    font-size: 1.3rem;
  }

  .refresh-btn {
    padding: 0.4rem 0.75rem;
    background: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.85rem;
    transition: all 0.2s;
  }

  .refresh-btn:hover:not(:disabled) {
    background: var(--border-color);
  }

  .refresh-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .loading,
  .empty-state {
    text-align: center;
    padding: 2rem;
    color: var(--text-secondary);
  }

  .error {
    background: var(--bg-secondary);
    border: 1px solid var(--text-secondary);
    border-radius: 4px;
    padding: 1rem;
    text-align: center;
    color: var(--text-primary);
  }

  .error p {
    margin: 0 0 0.75rem 0;
  }

  .error-details {
    margin: 0.75rem 0;
    padding: 0.5rem;
    background: var(--bg-primary);
    border-radius: 4px;
    border-left: 3px solid var(--text-secondary);
  }

  .error-status {
    display: block;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--text-secondary);
    margin-bottom: 0.25rem;
  }

  .error-hint {
    font-size: 0.85rem;
    color: var(--text-secondary);
    line-height: 1.3;
  }

  .btn-retry {
    padding: 0.4rem 1rem;
    background: var(--accent-color, #333333);
    color: var(--bg-primary);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.85rem;
  }

  .btn-retry:hover {
    opacity: 0.8;
  }

  .devices-list {
    display: grid;
    gap: 0.75rem;
  }

  .device-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    padding: 1rem;
    transition: all 0.2s;
  }

  .device-card:hover {
    border-color: var(--text-secondary);
  }

  .device-card.current-device {
    border: 2px solid var(--status-connected);
    background: var(--bg-primary);
    box-shadow: inset 0 0 8px rgba(0, 128, 0, 0.08);
  }

  .current-device-badge {
    display: inline-block;
    background: var(--status-connected);
    color: white;
    padding: 0.25rem 0.6rem;
    border-radius: 3px;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 0.5rem;
    margin-right: 0.5rem;
  }

  .device-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.75rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--border-color);
    gap: 1rem;
  }

  .device-name-section {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .device-name {
    margin: 0;
    font-size: 1.1rem;
    color: var(--text-primary);
    word-break: break-word;
  }

  .device-fqdn {
    margin: 0.15rem 0 0 0;
    font-size: 0.8rem;
    color: var(--text-secondary);
    font-family: "Courier New", monospace;
    word-break: break-all;
  }

  .device-status {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.3rem 0.6rem;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 3px;
    color: var(--status-color);
    font-weight: 600;
    font-size: 0.8rem;
    white-space: nowrap;
  }

  .status-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--status-color);
  }

  .device-details {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.75rem;
    font-size: 0.9rem;
  }

  .detail-row {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .detail-label {
    font-size: 0.75rem;
    color: var(--text-secondary);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .detail-value {
    font-size: 0.85rem;
    color: var(--text-primary);
    font-family: "Courier New", monospace;
    word-break: break-all;
  }

  .reachability-value {
    color: var(--reachability-color);
    font-weight: 600;
    font-family: inherit;
  }

  .tags {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
  }

  .tag {
    display: inline-block;
    padding: 0.2rem 0.5rem;
    background: var(--text-primary);
    color: var(--bg-primary);
    border-radius: 3px;
    font-size: 0.75rem;
    font-weight: 600;
  }
</style>

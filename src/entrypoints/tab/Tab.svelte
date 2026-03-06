<script lang="ts">
  import { onMount } from "svelte";
  import { Router } from "sv-router";
  import { tailscaleApiKey, themePreference } from "../../lib/storage";
  import { isActive, p } from "./router";
  import { checkBrowserConnectivity, type ConnectivityCheckResult } from "../../lib/api";
  import { getCachedLocalIPs } from "../../lib/localIp";
  import { isCurrentDeviceIPAvailable } from "../../lib/reachability";
  import "./router";

  let apiKeyConfigured = $state(false);
  let loading = $state(true);
  let isDarkMode = $state(false);
  let currentTheme = $state<"light" | "dark" | "system">("system");
  let apiConnected = $state<boolean | null>(null);
  let deviceInTailnet = $state<boolean | null>(null);
  let statusCheckInterval: number | null = null;
  let forceCheckingDevice = $state(false);

  async function checkStatus() {
    // Check API connectivity
    try {
      const connectivityResult = await checkBrowserConnectivity();
      apiConnected = connectivityResult.isConnected;
    } catch (error) {
      console.error("Error checking API connectivity:", error);
      apiConnected = false;
    }

    // Check if device is in tailnet
    try {
      const localIPs = await getCachedLocalIPs();
      if (localIPs.length > 0) {
        deviceInTailnet = await isCurrentDeviceIPAvailable(localIPs);
      } else {
        deviceInTailnet = null; // Unknown if no local IPs
      }
    } catch (error) {
      console.error("Error checking device tailnet status:", error);
      deviceInTailnet = null;
    }
  }

  async function forceCheckDeviceStatus() {
    forceCheckingDevice = true;
    try {
      const localIPs = await getCachedLocalIPs();
      if (localIPs.length > 0) {
        console.log("Force checking device IP against tailnet...");
        deviceInTailnet = await isCurrentDeviceIPAvailable(localIPs);
        console.log(`Device IP check result: ${deviceInTailnet ? "IN TAILNET" : "NOT IN TAILNET"}`);
      } else {
        deviceInTailnet = null; // Unknown if no local IPs
        console.warn("No local IPs available for force check");
      }
    } catch (error) {
      console.error("Error force checking device tailnet status:", error);
      deviceInTailnet = null;
    } finally {
      forceCheckingDevice = false;
    }
  }

  onMount(() => {
    // Async initialization function
    const init = async () => {
      // Load preferences
      const key = await tailscaleApiKey.getValue();
      apiKeyConfigured = !!key;
      currentTheme = await themePreference.getValue();

      // Set initial theme
      updateTheme();

      // Listen for system theme changes
      if (window.matchMedia) {
        window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", updateTheme);
      }

      loading = false;

      // Check status initially and every 30 seconds if API key is configured
      if (apiKeyConfigured) {
        await checkStatus();
        statusCheckInterval = setInterval(checkStatus, 30000) as unknown as number;
      }
    };

    // Listen for device connection notifications from background script
    const messageListener = (message: any) => {
      if (message.type === "DEVICE_CONNECTED_TO_TAILNET") {
        console.log("Device connected to tailnet notification received, refreshing status");
        void checkStatus();
      } else if (message.type === "TAILNET_CONNECTION_CHANGED") {
        if (message.connected) {
          console.log("Device connected to tailnet, refreshing status");
        } else {
          console.log("Device disconnected from tailnet, refreshing status");
        }
        void checkStatus();
      }
    };

    browser.runtime.onMessage.addListener(messageListener);

    // Run the async init
    init();

    // Return cleanup function directly (not from async)
    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
      browser.runtime.onMessage.removeListener(messageListener);
    };
  });

  function updateTheme() {
    const theme = currentTheme === "system" ? getSystemTheme() : currentTheme;
    isDarkMode = theme === "dark";
    document.documentElement.setAttribute("data-theme", theme);
  }

  function getSystemTheme(): "light" | "dark" {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  async function toggleTheme() {
    const themes: Array<"light" | "dark" | "system"> = ["light", "dark", "system"];
    const currentIndex = themes.indexOf(currentTheme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];

    currentTheme = nextTheme;
    await themePreference.setValue(nextTheme);
    updateTheme();
  }

  function openSettings() {
    browser.runtime.openOptionsPage();
  }
</script>

<main>
  {#if loading}
    <div class="container loading-state">
      <p>Loading...</p>
    </div>
  {:else if !apiKeyConfigured}
    <div class="container welcome-state">
      <header>
        <h1>Tailscale Home</h1>
        <p class="subtitle">Browser extension</p>
      </header>

      <div class="welcome-content">
        <h2>Configuration Required</h2>
        <p>Get started by configuring your Tailscale API key.</p>

        <button class="btn btn-primary" onclick={openSettings}> Configure API Key </button>

        <p class="secondary-text">You can also access settings from the extension options page.</p>
      </div>

      <footer>
        <p>
          Need help? Visit the
          <a href="https://tailscale.com/kb" target="_blank" rel="noopener noreferrer"> Tailscale documentation </a>
        </p>
      </footer>
    </div>
  {:else}
    <div class="main-container">
      <header class="main-header">
        <div class="header-content">
          <h1>Tailscale Home</h1>

          <div class="header-actions">
            <button class="theme-btn" onclick={toggleTheme} title={`Switch theme (current: ${currentTheme})`}>
              {isDarkMode ? "Light" : "Dark"}
            </button>
            <button class="settings-btn" onclick={openSettings} title="Settings">Settings</button>
          </div>
          <div class="status-section">
            <div class="status-item">
              <span class="status-label">API:</span>
              <span class="status-value" class:status-connected={apiConnected === true} class:status-disconnected={apiConnected === false} class:status-unknown={apiConnected === null}>
                {#if apiConnected === true}
                  <span class="status-dot"></span> Connected
                {:else if apiConnected === false}
                  <span class="status-dot"></span> Disconnected
                {:else}
                  <span class="status-dot"></span> Checking...
                {/if}
              </span>
            </div>
            <div class="status-item">
              <span class="status-label">Device:</span>
              <span class="status-value" class:status-connected={deviceInTailnet === true} class:status-disconnected={deviceInTailnet === false} class:status-unknown={deviceInTailnet === null}>
                {#if deviceInTailnet === true}
                  <span class="status-dot"></span> In Tailnet
                {:else if deviceInTailnet === false}
                  <span class="status-dot"></span> Not in Tailnet
                {:else}
                  <span class="status-dot"></span> Unknown
                {/if}
              </span>
              <button class="force-check-btn" onclick={forceCheckDeviceStatus} disabled={forceCheckingDevice} title="Force check if this device's IP is in the tailnet">
                {forceCheckingDevice ? "Checking..." : "Check IP"}
              </button>
            </div>
          </div>
        </div>
      </header>

      <nav class="main-nav">
        <a href={p("/tab.html")} class:active={isActive("/tab.html")}>Devices</a>
        <a href={p("/tab.html/services")} class:active={isActive("/tab.html/services")}>Services</a>
      </nav>

      <Router />
    </div>
  {/if}
</main>

<style>
  :global([data-theme="light"]) {
    --bg-primary: #ffffff;
    --bg-secondary: #f5f5f5;
    --text-primary: #000000;
    --text-secondary: #666666;
    --border-color: #dddddd;
    --accent-color: #333333;
  }

  :global([data-theme="dark"]) {
    --bg-primary: #1a1a1a;
    --bg-secondary: #2d2d2d;
    --text-primary: #ffffff;
    --text-secondary: #b0b0b0;
    --border-color: #444444;
    --accent-color: #e0e0e0;
  }

  main {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    background-color: var(--bg-primary);
    color: var(--text-primary);
    transition:
      background-color 0.2s,
      color 0.2s;
  }

  .container {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 1.5rem;
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
  }

  header {
    text-align: center;
    margin-bottom: 1.5rem;
  }

  h1 {
    font-size: 1.8rem;
    margin: 0 0 0.25rem 0;
  }

  .subtitle {
    font-size: 0.9rem;
    margin: 0;
    opacity: 0.7;
  }

  .welcome-content {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 2rem;
    text-align: center;
  }

  .welcome-content h2 {
    font-size: 1.4rem;
    margin: 0 0 0.75rem 0;
    color: var(--text-primary);
  }

  .welcome-content p {
    color: var(--text-secondary);
    font-size: 0.95rem;
    margin: 0.75rem 0;
  }

  .btn {
    padding: 0.6rem 1.5rem;
    border: none;
    border-radius: 4px;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    display: inline-block;
    margin: 0.75rem 0;
  }

  .btn-primary {
    background: var(--accent-color);
    color: var(--bg-primary);
  }

  .btn-primary:hover {
    opacity: 0.8;
  }

  .secondary-text {
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin-top: 1rem;
  }

  footer {
    text-align: center;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  footer a {
    color: var(--accent-color);
    text-decoration: none;
    border-bottom: 1px solid var(--accent-color);
  }

  footer a:hover {
    opacity: 0.7;
  }

  .loading-state {
    justify-content: center;
    align-items: center;
  }

  .loading-state p {
    font-size: 1rem;
  }

  .main-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .main-header {
    padding: 1rem 1.5rem;
    color: var(--text-primary);
    border-bottom: 1px solid var(--border-color);
  }

  .status-section {
    display: flex;
    gap: 1.5rem;
    align-items: center;
  }

  .status-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
  }

  .status-label {
    color: var(--text-secondary);
    font-weight: 600;
  }

  .status-value {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-weight: 600;
    padding: 0.25rem 0.5rem;
    border-radius: 3px;
    background: var(--bg-secondary);
    white-space: nowrap;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
  }

  .status-connected {
    color: green;
  }

  .status-connected .status-dot {
    background-color: green;
    box-shadow: 0 0 4px green;
  }

  .status-disconnected {
    color: #e74c3c;
  }

  .status-disconnected .status-dot {
    background-color: #e74c3c;
  }

  .status-unknown {
    color: var(--text-secondary);
  }

  .status-unknown .status-dot {
    background-color: var(--text-secondary);
  }

  .force-check-btn {
    padding: 0.3rem 0.6rem;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    border-radius: 3px;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .force-check-btn:hover:not(:disabled) {
    background: var(--border-color);
  }

  .force-check-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .main-nav {
    display: flex;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem 0;
  }

  .main-nav a {
    display: inline-block;
    padding: 0.35rem 0.65rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .main-nav a.active {
    color: var(--text-primary);
    border-color: var(--text-primary);
  }

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
    gap: 1.5rem;
  }

  .header-content h1 {
    font-size: 1.5rem;
    margin: 0;
    white-space: nowrap;
  }

  .header-actions {
    display: flex;
    gap: 0.75rem;
    flex-shrink: 0;
  }

  .theme-btn,
  .settings-btn {
    padding: 0.4rem 0.75rem;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    border-radius: 4px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .theme-btn:hover,
  .settings-btn:hover {
    background: var(--border-color);
  }

  @media (max-width: 768px) {
    .container {
      padding: 1rem;
    }

    h1 {
      font-size: 1.4rem;
    }

    .header-content {
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .header-content h1 {
      font-size: 1.2rem;
    }

    .status-section {
      order: 3;
      width: 100%;
      gap: 1rem;
    }

    .status-item {
      font-size: 0.75rem;
    }

    .welcome-content {
      padding: 1.5rem;
    }
  }
</style>

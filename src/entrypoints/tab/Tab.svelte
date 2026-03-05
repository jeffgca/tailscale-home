<script lang="ts">
  import { onMount } from "svelte";
  import { Router } from "sv-router";
  import { tailscaleApiKey, themePreference } from "../../lib/storage";
  import { isActive, p } from "./router";
  import "./router";

  let apiKeyConfigured = $state(false);
  let loading = $state(true);
  let isDarkMode = $state(false);
  let currentTheme = $state<"light" | "dark" | "system">("system");

  onMount(async () => {
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
    gap: 1rem;
  }

  .header-content h1 {
    font-size: 1.5rem;
    margin: 0;
  }

  .header-actions {
    display: flex;
    gap: 0.75rem;
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
      flex-direction: column;
      align-items: flex-start;
    }

    .welcome-content {
      padding: 1.5rem;
    }
  }
</style>

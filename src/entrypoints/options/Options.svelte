<script lang="ts">
  import { onMount } from "svelte";
  import { tailscaleApiKey, tailscaleTailnet, tailnetCheckIntervalSeconds, deviceProbeIntervalSeconds } from "../../lib/storage";
  import { isValidApiKeyFormat, TailscaleAPI } from "../../lib/api";

  let apiKey = $state("");
  let tailnet = $state("-");
  let tailnetCheckInterval = $state(30);
  let deviceProbeInterval = $state(300);
  let showApiKey = $state(false);
  let saveStatus = $state<"idle" | "saving" | "saved" | "error">("idle");
  let errorMessage = $state("");
  let testingConnection = $state(false);
  let connectionTestResult = $state<"none" | "success" | "failed">("none");

  // Load saved values on mount
  onMount(async () => {
    apiKey = await tailscaleApiKey.getValue();
    tailnet = await tailscaleTailnet.getValue();
    tailnetCheckInterval = await tailnetCheckIntervalSeconds.getValue();
    deviceProbeInterval = await deviceProbeIntervalSeconds.getValue();
  });

  async function handleSave() {
    // Validate API key format
    if (apiKey && !isValidApiKeyFormat(apiKey)) {
      saveStatus = "error";
      errorMessage = 'API key must start with "tskey-api-"';
      return;
    }

    saveStatus = "saving";
    errorMessage = "";
    connectionTestResult = "none";

    try {
      await tailscaleApiKey.setValue(apiKey);
      await tailscaleTailnet.setValue(tailnet);
      await tailnetCheckIntervalSeconds.setValue(tailnetCheckInterval);
      await deviceProbeIntervalSeconds.setValue(deviceProbeInterval);

      saveStatus = "saved";
      setTimeout(() => {
        if (saveStatus === "saved") {
          saveStatus = "idle";
        }
      }, 3000);
    } catch (error) {
      saveStatus = "error";
      errorMessage = error instanceof Error ? error.message : "Failed to save settings";
    }
  }

  async function handleTestConnection() {
    if (!apiKey) {
      errorMessage = "Please enter an API key first";
      return;
    }

    if (!isValidApiKeyFormat(apiKey)) {
      errorMessage = "Invalid API key format";
      return;
    }

    testingConnection = true;
    connectionTestResult = "none";
    errorMessage = "";

    try {
      const client = new TailscaleAPI(apiKey, tailnet);
      const success = await client.testConnection();

      connectionTestResult = success ? "success" : "failed";
      if (!success) {
        errorMessage = "Connection test failed. Please check your API key and network connection.";
      }
    } catch (error) {
      connectionTestResult = "failed";
      errorMessage = error instanceof Error ? error.message : "Connection test failed";
    } finally {
      testingConnection = false;
    }
  }

  function handleClear() {
    apiKey = "";
    tailnet = "-";
    saveStatus = "idle";
    errorMessage = "";
    connectionTestResult = "none";
  }

  async function openMainPage() {
    const tabUrl = browser.runtime.getURL("/tab.html");

    // Query all tabs to find if one with our page is already open
    const tabs = await browser.tabs.query({});
    const existingTab = tabs.find((tab) => tab.url === tabUrl);

    if (existingTab && existingTab.id) {
      // Tab already open - switch to it
      await browser.tabs.update(existingTab.id, { active: true });
      // Also bring the window to focus if the tab is in a different window
      if (existingTab.windowId) {
        await browser.windows.update(existingTab.windowId, { focused: true });
      }
    } else {
      // Tab not open - create a new one
      await browser.tabs.create({
        url: tabUrl,
      });
    }
  }
</script>

<main>
  <header>
    <div class="header-content">
      <div class="header-text">
        <h1>⚙️ Tailscale Home Settings</h1>
        <p class="subtitle">Configure your Tailscale API credentials</p>
      </div>
      <button type="button" class="btn-link-main" onclick={openMainPage}> Open Main Page → </button>
    </div>
  </header>

  <div class="settings-form">
    <div class="form-group">
      <label for="apiKey">
        Tailscale API Key
        <span class="required">*</span>
      </label>
      <div class="input-with-toggle">
        <input id="apiKey" type={showApiKey ? "text" : "password"} bind:value={apiKey} placeholder="tskey-api-xxxxx" class:error={saveStatus === "error"} />
        <button type="button" class="toggle-visibility" onclick={() => (showApiKey = !showApiKey)} title={showApiKey ? "Hide API key" : "Show API key"}>
          {showApiKey ? "👁️" : "👁️‍🗨️"}
        </button>
      </div>
      <p class="help-text">
        Get your API key from the
        <a href="https://login.tailscale.com/admin/settings/keys" target="_blank" rel="noopener noreferrer"> Tailscale Admin Console </a>
      </p>
    </div>

    <div class="form-group">
      <label for="tailnet"> Tailnet ID </label>
      <input id="tailnet" type="text" bind:value={tailnet} placeholder="-" />
      <p class="help-text">Use "-" for your default tailnet, or enter your specific tailnet ID</p>
    </div>

    <hr />

    <div class="form-group">
      <label for="tailnetCheckInterval"> Tailnet Connection Check Interval (seconds) </label>
      <input id="tailnetCheckInterval" type="number" bind:value={tailnetCheckInterval} min="5" max="300" />
      <p class="help-text">How often to check if this device is connected to the tailnet (default: 30 seconds)</p>
    </div>

    <div class="form-group">
      <label for="deviceProbeInterval"> Device Reachability Probe Interval (seconds) </label>
      <input id="deviceProbeInterval" type="number" bind:value={deviceProbeInterval} min="30" max="3600" />
      <p class="help-text">How often to probe device reachability when connected to tailnet (default: 300 seconds / 5 minutes)</p>
    </div>

    {#if errorMessage}
      <div class="alert alert-error">
        ⚠️ {errorMessage}
      </div>
    {/if}

    {#if connectionTestResult === "success"}
      <div class="alert alert-success">✅ Connection test successful!</div>
    {/if}

    {#if connectionTestResult === "failed"}
      <div class="alert alert-error">❌ Connection test failed</div>
    {/if}

    <div class="button-group">
      <button type="button" class="btn btn-primary" onclick={handleSave} disabled={saveStatus === "saving"}>
        {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "✓ Saved!" : "Save Settings"}
      </button>

      <button type="button" class="btn btn-secondary" onclick={handleTestConnection} disabled={testingConnection || !apiKey}>
        {testingConnection ? "Testing..." : "Test Connection"}
      </button>

      <button type="button" class="btn btn-outline" onclick={handleClear}> Clear </button>
    </div>
  </div>

  <footer>
    <div class="info-box">
      <h3>ℹ️ About API Keys</h3>
      <ul>
        <li>API keys are stored locally in your browser</li>
        <li>Keys should start with <code>tskey-api-</code></li>
        <li>You can create keys in the <a href="https://login.tailscale.com/admin/settings/keys" target="_blank" rel="noopener noreferrer">Tailscale Admin Console</a></li>
        <li>Keys can be set to expire between 1-90 days</li>
      </ul>
    </div>
  </footer>
</main>

<style>
  main {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }

  header {
    margin-bottom: 2rem;
    border-bottom: 2px solid #eee;
    padding-bottom: 1rem;
  }

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }

  .header-text {
    flex: 1;
  }

  .btn-link-main {
    padding: 0.6rem 1.2rem;
    background: #0066cc;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.95rem;
    white-space: nowrap;
    transition: background 0.2s;
  }

  .btn-link-main:hover {
    background: #0052a3;
  }

  h1 {
    margin: 0 0 0.5rem 0;
    font-size: 2rem;
    color: #333;
  }

  .subtitle {
    margin: 0;
    color: #666;
    font-size: 1rem;
  }

  .settings-form {
    background: #f9f9f9;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 2rem;
    margin-bottom: 2rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: #333;
  }

  .required {
    color: #e74c3c;
  }

  .input-with-toggle {
    display: flex;
    gap: 0.5rem;
  }

  input {
    flex: 1;
    padding: 0.75rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 1rem;
    font-family: "Courier New", monospace;
  }

  input:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
  }

  input.error {
    border-color: #e74c3c;
  }

  .toggle-visibility {
    padding: 0.75rem 1rem;
    background: #fff;
    border: 1px solid #ccc;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1.2rem;
    transition: background-color 0.2s;
  }

  .toggle-visibility:hover {
    background: #f0f0f0;
  }

  .help-text {
    margin: 0.5rem 0 0 0;
    font-size: 0.875rem;
    color: #666;
  }

  .help-text a {
    color: #3498db;
    text-decoration: none;
  }

  .help-text a:hover {
    text-decoration: underline;
  }

  .alert {
    padding: 1rem;
    border-radius: 4px;
    margin-bottom: 1rem;
  }

  .alert-error {
    background: #fee;
    border: 1px solid #e74c3c;
    color: #c0392b;
  }

  .alert-success {
    background: #efe;
    border: 1px solid #27ae60;
    color: #229954;
  }

  .button-group {
    display: flex;
    gap: 1rem;
    margin-top: 1.5rem;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background: #3498db;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: #2980b9;
  }

  .btn-secondary {
    background: #27ae60;
    color: white;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #229954;
  }

  .btn-outline {
    background: white;
    color: #333;
    border: 1px solid #ccc;
  }

  .btn-outline:hover:not(:disabled) {
    background: #f0f0f0;
  }

  footer {
    margin-top: 2rem;
  }

  .info-box {
    background: #f0f8ff;
    border: 1px solid #3498db;
    border-radius: 8px;
    padding: 1.5rem;
  }

  .info-box h3 {
    margin-top: 0;
    color: #2980b9;
  }

  .info-box ul {
    margin: 0;
    padding-left: 1.5rem;
  }

  .info-box li {
    margin-bottom: 0.5rem;
    color: #555;
  }

  .info-box code {
    background: #e8f4f8;
    padding: 0.2rem 0.4rem;
    border-radius: 3px;
    font-family: "Courier New", monospace;
  }

  .info-box a {
    color: #3498db;
    text-decoration: none;
  }

  .info-box a:hover {
    text-decoration: underline;
  }

  @media (prefers-color-scheme: dark) {
    h1 {
      color: #eee;
    }

    .subtitle {
      color: #aaa;
    }

    .settings-form {
      background: #2a2a2a;
      border-color: #444;
    }

    label {
      color: #eee;
    }

    input {
      background: #333;
      color: #eee;
      border-color: #555;
    }

    .toggle-visibility {
      background: #333;
      color: #eee;
      border-color: #555;
    }

    .toggle-visibility:hover {
      background: #444;
    }

    .help-text {
      color: #aaa;
    }

    .btn-outline {
      background: #333;
      color: #eee;
      border-color: #555;
    }

    .btn-outline:hover:not(:disabled) {
      background: #444;
    }

    .info-box {
      background: #2a3a4a;
      border-color: #3498db;
    }

    .info-box h3 {
      color: #5dade2;
    }

    .info-box li {
      color: #ccc;
    }

    .info-box code {
      background: #1a2a3a;
    }
  }
</style>

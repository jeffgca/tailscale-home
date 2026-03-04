<script lang="ts">
  import { onMount } from "svelte";
  import { tailscaleApiKey } from "../../lib/storage";

  let apiKeyConfigured = $state(false);
  let loading = $state(true);

  onMount(async () => {
    const key = await tailscaleApiKey.getValue();
    apiKeyConfigured = !!key;
    loading = false;
  });

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
        <h1>🔑 Tailscale Home</h1>
        <p class="subtitle">Tailscale extension for browser</p>
      </header>

      <div class="welcome-content">
        <div class="icon">🚀</div>
        <h2>Welcome to Tailscale Home</h2>
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
    <div class="container main-state">
      <header>
        <h1>🏠 Tailscale Home</h1>
      </header>

      <div class="content">
        <p>✅ API Key configured</p>
        <p>More features coming soon...</p>
      </div>

      <footer>
        <button class="btn btn-secondary" onclick={openSettings}> Settings </button>
      </footer>
    </div>
  {/if}
</main>

<style>
  main {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }

  .container {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
  }

  header {
    text-align: center;
    color: white;
    margin-bottom: 2rem;
  }

  h1 {
    font-size: 2.5rem;
    margin: 0 0 0.5rem 0;
  }

  .subtitle {
    font-size: 1.1rem;
    margin: 0;
    opacity: 0.9;
  }

  .welcome-content {
    background: white;
    border-radius: 12px;
    padding: 3rem 2rem;
    text-align: center;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  }

  .icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  .welcome-content h2 {
    font-size: 1.8rem;
    margin: 1rem 0;
    color: #333;
  }

  .welcome-content p {
    color: #666;
    font-size: 1.1rem;
    margin: 1rem 0;
  }

  .btn {
    padding: 0.75rem 2rem;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
    display: inline-block;
    margin: 1rem 0;
  }

  .btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
  }

  .btn-secondary {
    background: #f0f0f0;
    color: #333;
  }

  .btn-secondary:hover {
    background: #e0e0e0;
  }

  .secondary-text {
    font-size: 0.95rem;
    color: #999;
    margin-top: 1.5rem;
  }

  footer {
    text-align: center;
    color: white;
    font-size: 0.95rem;
  }

  footer a {
    color: #fff;
    text-decoration: underline;
  }

  footer a:hover {
    opacity: 0.8;
  }

  .loading-state {
    justify-content: center;
    align-items: center;
  }

  .loading-state p {
    color: white;
    font-size: 1.2rem;
  }

  .main-state {
    color: white;
  }

  .content {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 2rem;
    flex: 1;
    color: white;
  }

  .content p {
    font-size: 1.1rem;
    margin: 0.5rem 0;
  }

  @media (max-width: 768px) {
    h1 {
      font-size: 1.8rem;
    }

    .welcome-content {
      padding: 2rem 1.5rem;
    }

    .btn {
      padding: 0.6rem 1.5rem;
      font-size: 0.95rem;
    }
  }
</style>

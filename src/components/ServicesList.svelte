<script lang="ts">
  import { onMount } from "svelte";
  import { createTailscaleClient, ConnectivityStatus } from "../lib/api";
  import type { Service, ConnectivityCheckResult } from "../lib/api";
  import { useTailnetContext } from "../lib/tailnetContext";

  let services = $state<Service[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let errorDetails = $state<ConnectivityCheckResult | null>(null);
  let refreshing = $state(false);
  let lastConnectionRevision = $state(0);

  const tailnet = useTailnetContext();

  function applyDisconnectedError() {
    error = tailnet.state.connectivity?.message || "Unable to reach Tailscale API from this browser.";
    errorDetails = tailnet.state.connectivity;
    services = [];
  }

  async function loadServices() {
    loading = true;
    error = null;
    errorDetails = null;

    try {
      if (tailnet.state.apiConnected !== true) {
        await tailnet.refreshStatus();
      }

      if (tailnet.state.apiConnected !== true) {
        applyDisconnectedError();
        return;
      }

      const client = await createTailscaleClient();
      if (!client) {
        error = "Failed to create API client";
        return;
      }

      const result = await client.listServices();
      services = result.vipServices || [];
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to load services";
      console.error("Error loading services:", err);
    } finally {
      loading = false;
    }
  }

  async function refreshServices() {
    refreshing = true;
    await tailnet.refreshStatus();
    await loadServices();
    refreshing = false;
  }

  onMount(() => {
    void loadServices();
  });

  $effect(() => {
    const revision = tailnet.state.connectionRevision;

    if (revision !== lastConnectionRevision) {
      lastConnectionRevision = revision;
      void loadServices();
    }
  });

  $effect(() => {
    const connected = tailnet.state.apiConnected;

    if (connected === false) {
      applyDisconnectedError();
    }
  });
</script>

<div class="services-container">
  <div class="services-header">
    <h2>Services ({services.length})</h2>
    <button class="refresh-btn" onclick={refreshServices} disabled={refreshing || loading}>
      {refreshing ? "Refreshing..." : "Refresh"}
    </button>
  </div>

  {#if loading}
    <div class="loading">
      <p>Loading services...</p>
    </div>
  {:else if error}
    <div class="error">
      <p>{error}</p>
      {#if errorDetails}
        <div class="error-details">
          <span class="error-status">{errorDetails.status}</span>
          {#if errorDetails.status === ConnectivityStatus.NetworkError}
            <div class="error-hint">Unable to reach Tailscale API from this browser.</div>
          {:else if errorDetails.status === ConnectivityStatus.AuthenticationFailed}
            <div class="error-hint">Check your API key in extension settings.</div>
          {/if}
        </div>
      {/if}
      <button class="btn-retry" onclick={loadServices}>Retry</button>
    </div>
  {:else if services.length === 0}
    <div class="empty-state">
      <p>No services are currently defined for this tailnet.</p>
    </div>
  {:else}
    <div class="services-list">
      {#each services as service (service.name)}
        <div class="service-card">
          <div class="service-header">
            <h3 class="service-name">{service.name}</h3>
            {#if service.comment}
              <span class="service-comment">{service.comment}</span>
            {/if}
          </div>

          <div class="service-details">
            <div class="detail-row">
              <span class="detail-label">Addresses</span>
              <div class="detail-list">
                {#each service.addrs ?? [] as addr}
                  <span class="pill">{addr}</span>
                {/each}
              </div>
            </div>

            <div class="detail-row">
              <span class="detail-label">Ports</span>
              <div class="detail-list">
                {#each service.ports ?? [] as port}
                  <span class="pill">{port}</span>
                {/each}
              </div>
            </div>

            {#if service.tags && service.tags.length > 0}
              <div class="detail-row">
                <span class="detail-label">Tags</span>
                <div class="detail-list">
                  {#each service.tags as tag}
                    <span class="pill">{tag}</span>
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
  .services-container {
    width: 100%;
    padding: 1rem;
    overflow-y: auto;
    flex: 1;
  }

  .services-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    color: var(--text-primary);
  }

  .services-header h2 {
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

  .services-list {
    display: grid;
    gap: 0.75rem;
  }

  .service-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    padding: 1rem;
  }

  .service-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .service-name {
    margin: 0;
    font-size: 1rem;
    color: var(--text-primary);
    font-family: "Courier New", monospace;
  }

  .service-comment {
    color: var(--text-secondary);
    font-size: 0.8rem;
  }

  .service-details {
    display: grid;
    gap: 0.6rem;
  }

  .detail-row {
    display: grid;
    gap: 0.3rem;
  }

  .detail-label {
    font-size: 0.75rem;
    color: var(--text-secondary);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .detail-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .pill {
    display: inline-block;
    padding: 0.15rem 0.45rem;
    border: 1px solid var(--border-color);
    border-radius: 999px;
    font-size: 0.75rem;
    color: var(--text-primary);
    font-family: "Courier New", monospace;
  }
</style>

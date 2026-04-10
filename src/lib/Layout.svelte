<script lang="ts">
	import type { Snippet } from 'svelte';
	import { appState } from '@/lib/appstate.svelte';
	import { JsonView } from '@zerodevx/svelte-json-view';
	import Status from '@/lib/Status.svelte';
	let loading = $state(false);

	let { children }: { children: Snippet } = $props();
	let apiKeyConfigured = $derived(!!appState.state.apiKey);

	function openSettings() {
		browser.runtime.openOptionsPage();
	}
</script>

<main>
	<header class="main-header columns-2">
		<div class="header-content prose">
			<h1>Tailscale Home</h1>
		</div>
		<Status
			status={appState.state.status}
			apiStatus={appState.state.apiStatus}
		/>
	</header>
	{#if loading}
		<div class="container loading-state">
			<p>Loading...</p>
		</div>
	{:else if !apiKeyConfigured}
		<div class="container welcome-state">
			<div class="welcome-content">
				<h2>Configuration Required</h2>
				<p>Get started by configuring your Tailscale API key.</p>

				<button class="btn btn-primary" onclick={openSettings}>
					Configure API Key
				</button>

				<p class="secondary-text">
					You can also access settings from the extension options page.
				</p>
			</div>
		</div>
	{:else}
		<div class="main-container">
			<div class="content">
				<!-- <h2>Welcome to Tailscale Home</h2> -->
				<p>
					This is a Svelte-based browser extension that connects to the
					Tailscale API to provide insights and management capabilities for your
					tailnet.
				</p>

				<div>
					<div role="tablist" class="tabs tabs-lift">
						<a href="/tab.html" role="tab" class="tab">Services</a>
						<a href="/tab.html/devices" role="tab" class="tab">Devices</a>
					</div>
				</div>

				<div class="main-content">
					{@render children()}
				</div>
			</div>
		</div>
		<details class="collapse bg-base-100 border-base-300 border">
			<summary class="collapse-title font-semibold">Debug Info</summary>
			<div class="collapse-content text-sm">
				<JsonView json={appState.state} />
			</div>
		</details>
	{/if}
</main>

<style>
</style>

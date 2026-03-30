<script lang="ts">
	import './app.css';
	import { onMount } from 'svelte';
	import { JsonView } from '@zerodevx/svelte-json-view';

	let loading = $state(false);

	import { createProxyService } from '@webext-core/proxy-service';
	import { APP_KEY } from '../background/proxy_keys';
	import Services from '@/lib/Services.svelte';
	import Devices from '@/lib/Devices.svelte';

	interface AppState {
		apiKey?: string;
		services?: any[];
		[key: string]: any;
	}

	// 5. Get a proxy of your service
	const appService = createProxyService(APP_KEY);
	let appState = $state<AppState>({});

	browser.runtime.onMessage.addListener((message) => {
		if (message.type === 'APP_STATE_UPDATE') {
			console.log('Received app state update:', message.state);
			appState = message.state;
		}
	});

	let apiKeyConfigured = $derived(!!appState.apiKey);

	$inspect('appState', appState);

	onMount(async () => {
		console.log('in onMount');
		appService.getState().then((state) => {
			console.log('Received state from background:', state);
			appState = state;
			// loading = false;

			if (appState?.localIps.length > 0 && appState?.devices?.length > 0) {
				// loading = false;

				console.log('XXX appState', appState);

				appState.devices.forEach(
					(device: { address: any; isCurrent: boolean }, i: number) => {
						if (appState.localIps.includes(device.address)) {
							appState.devices[i].isCurrent = true;
							// console.log('XXX', appState.currentDevice);
							return;
						} else {
							device.isCurrent = false;
						}
					},
				);
			}
		});
	});

	function openSettings() {
		browser.runtime.openOptionsPage();
	}
</script>

<main>
	<header class="main-header">
		<div class="header-content prose">
			<h1>Tailscale Home</h1>
		</div>
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
			<div class="content prose">
				<!-- <h2>Welcome to Tailscale Home</h2> -->
				<p>
					This is a Svelte-based browser extension that connects to the
					Tailscale API to provide insights and management capabilities for your
					tailnet.
				</p>

				<div class="tabs tabs-border">
					<input
						type="radio"
						name="my_tabs_2"
						class="tab"
						aria-label="Services"
						checked={true}
					/>
					<div class="tab-content border-base-300 bg-base-100 p-10">
						<Services services={appState?.services} />
					</div>

					<input
						type="radio"
						name="my_tabs_2"
						class="tab"
						aria-label="Devices"
					/>
					<div class="tab-content border-base-300 bg-base-100 p-10">
						<Devices
							devices={appState?.devices}
							currentDevice={appState?.currentDevice}
						/>
					</div>
				</div>
			</div>
		</div>
		<details class="collapse bg-base-100 border-base-300 border">
			<summary class="collapse-title font-semibold">Debug Info</summary>
			<div class="collapse-content text-sm">
				<JsonView json={appState} />
			</div>
		</details>
	{/if}
</main>

<style>
	:global([data-theme='light']) {
		--bg-primary: #ffffff;
		--bg-secondary: #f5f5f5;
		--text-primary: #000000;
		--text-secondary: #666666;
		--border-color: #dddddd;
		--accent-color: #333333;
	}

	:global([data-theme='dark']) {
		--bg-primary: #1a1a1a;
		--bg-secondary: #2d2d2d;
		--text-primary: #ffffff;
		--text-secondary: #b0b0b0;
		--border-color: #444444;
		--accent-color: #e0e0e0;
	}

	.content {
		padding: 1.5rem;
		max-width: 1200px;
		margin: 0 auto;
		width: 100%;
	}

	main {
		/* width: 100%;
		height: 100%; */
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

	.loading-state {
		justify-content: center;
		align-items: center;
	}

	.loading-state p {
		font-size: 1rem;
	}

	.main-container {
		/* width: 100%;
		height: 100%; */
		display: flex;
		flex-direction: column;
	}

	.main-header {
		padding: 1rem 1.5rem;
		color: var(--text-primary);
		border-bottom: 1px solid var(--border-color);
	}
</style>

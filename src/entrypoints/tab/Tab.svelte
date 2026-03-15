<script lang="ts">
	import './app.css';
	import { onMount } from 'svelte';

	let loading = $state(false);

	import { createProxyService } from '@webext-core/proxy-service';
	import { APP_KEY } from '../background/proxy_keys';
	import { setContext } from 'svelte';
	// import app from './main';

	// 5. Get a proxy of your service
	const appService = createProxyService(APP_KEY);

	let apiKeyConfigured = $derived((state: { apiKey: any }) => {
		return !!state.apiKey;
	});

	let appState = $state({});

	// appService.getState().then((state) => {
	// 	console.log('Initial app state:', state);
	// 	appState = state;
	// });

	onMount(async () => {
		// Async initialization function
		// const init = async () => {
		// 	loading = true;
		// 	try {
		// 		await appService.initialize();
		// 		console.log('App state after initialization:', appState);
		// 	} catch (error) {
		// 		console.error('Error during app initialization:', error);
		// 	} finally {
		// 		loading = false;
		// 	}
		// };

		// await init();

		// Listen for device connection notifications from background script
		const messageListener = (message: any) => {
			console.log('message:', message);
		};

		browser.runtime.onMessage.addListener(messageListener);

		// Return cleanup function directly (not from async)
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
				<h1>Tailscale Home</h1>
				<p class="subtitle">Browser extension</p>
			</header>

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
			<header class="main-header">
				<div class="header-content prose">
					<h1>Tailscale Home</h1>
				</div>
			</header>
		</div>
		<div>
			<p>Something here</p>
		</div>
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
</style>

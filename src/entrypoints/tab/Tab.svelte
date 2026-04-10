<script lang="ts">
	import './app.css';
	import { onMount } from 'svelte';
	import { JsonView } from '@zerodevx/svelte-json-view';

	import { createProxyService } from '@webext-core/proxy-service';
	import { APP_KEY } from '../background/proxy_keys';
	import { appState } from '@/lib/appstate.svelte';

	// import { p as path, navigate, isActive, route } from './router';

	import { Router } from 'sv-router';
	import './router.ts';

	const appService = createProxyService(APP_KEY);

	browser.runtime.onMessage.addListener((message) => {
		if (message.type === 'APP_STATE_UPDATE') {
			console.log('Received app state update:', message.state);
			appState.state = message.state;
		}
	});

	onMount(async () => {
		console.log('in onMount');
		appService.getState().then((state) => {
			appState.state = state;
		});
	});
</script>

<Router />

<script>
	// let { appState } = $props();
	import { appState } from './appstate.svelte';
	import { JsonView } from '@zerodevx/svelte-json-view';
	import { route } from '../entrypoints/tab/router';

	// import { onMount } from 'svelte';
	import { createProxyService } from '@webext-core/proxy-service';
	import { APP_KEY } from '../entrypoints/background/proxy_keys';

	const appService = createProxyService(APP_KEY);

	let _params = route.getParams('/tab.html/device/:name');

	// console.log('_params', _params.name);

	let _device = appState.state.devices?.find((d) => d.name === _params.name);

	console.log('route', route.pathname, _device);

	async function scanDevice() {
		// console.log('Scanning device for apps... (not implemented)');

		appService.scanDevice(_params.name).then((result) => {
			console.log('Scan result', result);
			// alert('XXX Scan complete! Check console for results.');
		});
	}
</script>

<div>
	<h3>Device</h3>
	<div>
		<p>Name: {_device?.name}</p>
		<p>Hostname: {_device?.hostname}</p>
		<p>OS: {_device?.os}</p>
		<p>Connected: {_device?.connected ? 'Yes' : 'No'}</p>

		<button class="btn" onclick={scanDevice}>Scan for apps</button>
	</div>

	<div>
		<JsonView json={appState} />
	</div>
</div>

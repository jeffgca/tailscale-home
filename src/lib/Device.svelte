<script>
	let { device } = $props();
	import { JsonView } from '@zerodevx/svelte-json-view';
</script>

<div>
	<h3>Device</h3>
	<JsonView data={device} />
</div>

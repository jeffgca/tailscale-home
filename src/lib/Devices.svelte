<script>
	let { devices } = $props();
</script>

{#each devices as device}
	<div class="device-card border rounded p-4 mb-4">
		<h3 class="text-lg font-semibold">{device.name}</h3>
		<p class="text-sm text-gray-600">IP: {device.ip}</p>
	</div>
{/each}

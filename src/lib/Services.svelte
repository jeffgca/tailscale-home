<script>
	// import { onMount } from 'svelte';

	let { services } = $props();
</script>

{#each services as service}
	<div class="service-card border rounded p-4 mb-4">
		<h3 class="text-lg font-semibold">{service.comment} - {service.name}</h3>
		<p class="text-sm text-gray-400">
			URL: <a href={service.uri}>{service.uri}</a>
		</p>
		<!-- <p></p> -->
	</div>
{/each}

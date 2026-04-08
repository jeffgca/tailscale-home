<script>
	let { services } = $props();
</script>

{#each services as service}
	<div class="service-card border rounded p-4 mb-4">
		<h3 class="text-lg font-semibold">{service.comment} - {service.name}</h3>
		<p class="text-sm text-gray-400">
			URL: <a target="_blank" href={service.uri}>{service.uri}</a>
		</p>
	</div>
{/each}

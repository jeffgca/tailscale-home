<script>
	let { services, metadata } = $props();

	function fetchPageMetadataFromTab(uri) {
		let _win = window.open(uri, '_blank');

		setTimeout(() => {
			_win.close();
		}, 1000);
	}

	let _services = $derived.by(() => {
		return services.map((service) => {
			if (metadata && metadata[service.uri]) {
				let imageUrl = `${metadata[service.uri]?.image}`;
				let _meta = {};
				_meta.image = imageUrl;
				_meta.description = metadata[service.uri]?.description;

				let _ret = {
					...service,
					metadata: _meta,
				};

				return _ret;
			} else {
				return {
					...service,
					metadata: metadata ? metadata[service.uri] : null,
				};
			}
		});
	});

	// $inspect('XXX _services', _services);
</script>

{#each _services as service}
	<div class="service-card border rounded p-2 mb-4">
		<div class="flex items-center space-x-4 mb-2">
			{#if service.metadata?.image}
				<img
					src={service?.metadata?.image}
					alt="Service Logo"
					height="48"
					width="48"
				/>
			{/if}
			<h3 class="text-lg font-semibold">{service.comment} - {service.name}</h3>
		</div>

		<p>
			Description: {service?.metadata?.description ||
				'No description available'}
		</p>
		<p class="text-sm text-gray-400">
			URL: <a target="_blank" href={service?.uri}>{service.uri}</a>
		</p>

		{#if !service.metadata}
			<button
				class="btn btn-primary mt-4"
				onclick={fetchPageMetadataFromTab(service.uri)}
			>
				Fetch Metadata
			</button>
		{/if}
	</div>
{/each}

<style>
	.service-card {
		background-color: var(--bg-secondary);
		color: var(--text-primary);
		border-color: var(--border-color);
	}
</style>

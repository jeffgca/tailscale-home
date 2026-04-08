<script>
	let { services, metadata } = $props();

	// $inspect('ZZZ metadata', metadata);

	let _services = $derived.by(() => {
		return services.map((service) => {
			// $inspect('XXX', metadata, service.uri);

			if (metadata && metadata[service.uri]) {
				let imageUrl = `${metadata[service.uri]?.image}`;
				let _meta = {
					...metadata,
					imageUrl,
				};
				// metadata[service.uri].imageUrl = imageUrl;
				$inspect(
					'ZZZ found metadata for service',
					service.uri,
					metadata[service.uri],
				);
				_meta.image = imageUrl;
				return {
					...service,
					metadata: _meta,
				};
			}
			// } else {
			// 	$inspect('ZZZ no metadata found for service yet', service.uri);
			// 	// insert default values?
			// 	return {
			// 		...service,
			// 		metadata: {},
			// 	};
			// }

			return {
				...service,
				metadata: metadata ? metadata[service.uri] : null,
			};
		});
	});

	$inspect('XXX _services', _services);
</script>

{#each _services as service}
	<div class="service-card border rounded p-4 mb-4">
		<h3 class="text-lg font-semibold">{service.comment} - {service.name}</h3>
		<img src={service?.metadata?.image} alt="Service Logo" />
		<p class="text-sm text-gray-400">
			URL: <a target="_blank" href={service?.uri}>{service.uri}</a>
		</p>
	</div>
{/each}

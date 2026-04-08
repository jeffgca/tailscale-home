export default defineContentScript({
	matches: ['*://*.gibbon-snake.ts.net/*', '*://app.plex.tv/*'],
	allFrames: true,
	main(ctx) {
		console.log('content script lodaded', ctx);
		function readMetadataFromDocument(resolvedUrl) {
			console.log('content script readMetadataFromDocument', resolvedUrl);
			const getMeta = (property) => {
				const el =
					document.querySelector(`meta[property="${property}"]`) ??
					document.querySelector(`meta[name="${property}"]`);
				return el?.getAttribute('content') ?? undefined;
			};

			const getIconUrl = () => {
				const el = document.querySelector(`link[rel^="apple-touch-icon"]`);
				return el?.getAttribute('href') ?? undefined;
			};

			let _image = getMeta('og:image') || getIconUrl();

			function getFullUrl(relative) {
				try {
					return new URL(relative, resolvedUrl).href;
				} catch (error) {
					console.error('Error resolving URL:', error);
					return relative; // fallback to the original relative URL
				}
			}

			return {
				url: resolvedUrl,
				title: (getMeta('og:title') ?? document.title) || undefined,
				description: getMeta('og:description'),
				image: _image,
			};
		}

		// console.log('content script main', ctx);

		const metadata = readMetadataFromDocument(window.location.href);

		console.log('metadata', metadata);

		browser.runtime.sendMessage({
			type: 'service-metadata',
			data: metadata,
			source: 'content-script',
			target: 'background',
		});
	},
});

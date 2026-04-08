export default defineContentScript({
	matches: ['*://*.gibbon-snake.ts.net/*'],
	allFrames: true,
	main(ctx) {
		function readMetadataFromDocument(resolvedUrl) {
			console.log('content script readMetadataFromDocument', resolvedUrl);
			const getMeta = (property) => {
				const el =
					document.querySelector(`meta[property="${property}"]`) ??
					document.querySelector(`meta[name="${property}"]`);
				return el?.getAttribute('content') ?? undefined;
			};

			const getIconUrl = () => {
				const el = document.querySelector(`link[rel~="apple-touch-icon"]`);
				return el?.getAttribute('href') ?? undefined;
			};

			return {
				url: resolvedUrl,
				title: (getMeta('og:title') ?? document.title) || undefined,
				description: getMeta('og:description'),
				image: getMeta('og:image') || getIconUrl(),
			};
		}

		// console.log('content script main', ctx);

		const metadata = readMetadataFromDocument(window.location.href);

		console.log('metadata', metadata);

		browser.runtime.onMessage.addListener((message, sender) => {
			if (message.type === 'get-serivice-metadata') {
				console.log(
					'Received GET_PAGE_METADATA message in content script',
					message,
				);
				const response = {
					ok: true,
					metadata,
				};
				return Promise.resolve(response);
			}
		});

		browser.runtime
			.sendMessage({
				type: 'iframe-metadata',
				data: metadata,
				source: 'content-script',
				tabId: ctx.tabId,
				frameId: ctx.frameId,
				url: window.location.href,
				title: document.title,
				timestamp: Date.now(),
				target: 'background',
			})
			.then((response) => {
				console.log('got response to ping', response);
			})
			.catch((error) => {
				console.error('Error sending ping message:', error);
			});

		// sendMessage('cs:ping', { data: metadata }, 'background').then(
		// 	(response) => {
		// 		console.log('got response to METADATA_RESPONSE', response)
		// 	},
		// )
	},
});

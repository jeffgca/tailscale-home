// console.log('in the offscreen page script')
import { getIps } from '../../lib/localip';

browser.runtime.onMessage.addListener((message) => {
	// console.log('message received in offscreen page', message);

	if (message.target && message.target !== 'offscreen') {
		return;
	}

	if (message.type === 'GET_LOCAL_IPS') {
		getIps()
			.then((ips) => {
				console.log('IPs found in offscreen', ips);
				browser.runtime.sendMessage({
					type: 'LOCAL_IPS',
					ips,
				});
			})
			.catch((err) => {
				console.error('Error getting IPs in offscreen page:', err);
			});
	}

	// if (message.type === 'GET_PAGE_METADATA') {
	// 	console.log('fetching page metadata', message.url);
	// 	return fetchPageMetadata(message.url)
	// 		.then((metadata) => ({ ok: true, metadata }))
	// 		.catch((error) => ({
	// 			ok: false,
	// 			error:
	// 				error instanceof Error
	// 					? error.message
	// 					: `Unknown offscreen metadata error for ${message.url}`,
	// 		}));
	// }
});

// function readMetadataFromDocument(doc, resolvedUrl) {
// 	console.log('XXX readMetadataFromDocument', resolvedUrl);
// 	const getMeta = (property) => {
// 		const el =
// 			doc.querySelector(`meta[property="${property}"]`) ??
// 			doc.querySelector(`meta[name="${property}"]`);
// 		return el?.getAttribute('content') ?? undefined;
// 	};

// 	return {
// 		url: resolvedUrl,
// 		title: (getMeta('og:title') ?? doc.title) || undefined,
// 		description: getMeta('og:description'),
// 		image: getMeta('og:image'),
// 		siteName: getMeta('og:site_name'),
// 		type: getMeta('og:type'),
// 		twitterCard: getMeta('twitter:card'),
// 		twitterTitle: getMeta('twitter:title'),
// 		twitterDescription: getMeta('twitter:description'),
// 		twitterImage: getMeta('twitter:image'),
// 		twitterSite: getMeta('twitter:site'),
// 		twitterCreator: getMeta('twitter:creator'),
// 	};
// }

function fetchPageMetadata(url, timeoutMs = 15000) {
	console.log('XXX fetchPageMetadata', fetchPageMetadata);
	return new Promise((resolve, reject) => {
		const iframe = document.createElement('iframe');

		console.log('XXX iframe', iframe);
		let done = false;

		const cleanup = () => {
			iframe.onload = null;
			iframe.onerror = null;
			if (iframe.parentNode) {
				iframe.parentNode.removeChild(iframe);
			}
		};

		const finishWithError = (error) => {
			if (done) return;
			done = true;
			clearTimeout(timeoutId);
			cleanup();
			reject(error);
		};

		const timeoutId = setTimeout(() => {
			finishWithError(
				new Error(`Timed out waiting for iframe metadata for ${url}`),
			);
		}, timeoutMs);

		iframe.style.display = 'none';

		iframe.onerror = () => {
			finishWithError(new Error(`Failed to load iframe for ${url}`));
		};

		iframe.onload = () => {
			console.log('hit iframe onload');
			// if (done) return;
			// try {
			// 	const doc = iframe.contentDocument;
			// 	if (!doc) {
			// 		throw new Error(`Iframe document unavailable for ${url}`);
			// 	}
			// 	const resolvedUrl = iframe.contentWindow?.location?.href || url;
			// 	const metadata = readMetadataFromDocument(doc, resolvedUrl);
			// 	done = true;
			// 	clearTimeout(timeoutId);
			// 	cleanup();
			// 	resolve(metadata);
			// } catch (error) {
			// 	finishWithError(
			// 		error instanceof Error
			// 			? error
			// 			: new Error(`Failed reading iframe metadata for ${url}`),
			// 	);
			// }
		};

		document.body.appendChild(iframe);
		iframe.src = url;
	});
}

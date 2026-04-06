// console.log('in the offscreen page script')
import { getIps } from '../../lib/localip';

async function fetchPageMetadata(url) {
	const response = await fetch(url, {
		headers: { Accept: 'text/html' },
		redirect: 'follow',
	});

	if (!response.ok) {
		throw new Error(
			`Failed to fetch page ${url}: ${response.status} ${response.statusText}`,
		);
	}

	const contentType = response.headers.get('content-type') ?? '';
	if (!contentType.includes('text/html')) {
		throw new Error(`Expected HTML response, got: ${contentType}`);
	}

	const html = await response.text();
	const parser = new DOMParser();
	const doc = parser.parseFromString(html, 'text/html');

	const getMeta = (property) => {
		const el =
			doc.querySelector(`meta[property="${property}"]`) ??
			doc.querySelector(`meta[name="${property}"]`);
		return el?.getAttribute('content') ?? undefined;
	};

	return {
		url: response.url || url,
		title: (getMeta('og:title') ?? doc.title) || undefined,
		description: getMeta('og:description'),
		image: getMeta('og:image'),
		siteName: getMeta('og:site_name'),
		type: getMeta('og:type'),
		twitterCard: getMeta('twitter:card'),
		twitterTitle: getMeta('twitter:title'),
		twitterDescription: getMeta('twitter:description'),
		twitterImage: getMeta('twitter:image'),
		twitterSite: getMeta('twitter:site'),
		twitterCreator: getMeta('twitter:creator'),
	};
}

browser.runtime.onMessage.addListener((message) => {
	console.log('message received in offscreen page', message);

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

	if (message.type === 'GET_PAGE_METADATA') {
		console.log('fetching page metadata', message.url);
		return fetchPageMetadata(message.url)
			.then((metadata) => ({ ok: true, metadata }))
			.catch((error) => ({
				ok: false,
				error:
					error instanceof Error
						? error.message
						: `Unknown offscreen metadata error for ${message.url}`,
			}));
	}
});

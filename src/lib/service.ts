// import { setupOffscreenDocument } from './offscreen';

const OFFSCREEN_DOCUMENT_PATH = '/offscreen.html';

interface OffscreenMetadataResponse {
	ok: boolean;
	metadata?: PageMetadata;
	error?: string;
}

export interface PageMetadata {
	url: string;
	title?: string;
	description?: string;
	image?: string;
	siteName?: string;
	type?: string;
	twitterCard?: string;
	twitterTitle?: string;
	twitterDescription?: string;
	twitterImage?: string;
	twitterSite?: string;
	twitterCreator?: string;
}

/**
 * Fetches a web page and parses OpenGraph and Twitter Card metadata from its HTML.
 */
export async function fetchPageMetadata(url: string): Promise<PageMetadata> {
	// await setupOffscreenDocument(OFFSCREEN_DOCUMENT_PATH);

	const response = (await browser.runtime.sendMessage({
		type: 'GET_PAGE_METADATA',
		target: 'offscreen',
		url,
	})) as OffscreenMetadataResponse;

	if (!response?.ok || !response.metadata) {
		throw new Error(response?.error ?? `Failed to fetch metadata for ${url}`);
	}

	return response.metadata;
}

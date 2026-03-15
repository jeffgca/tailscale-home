import { createTailscaleClient, checkBrowserConnectivity } from './api';

export class App {
	TAILNET_API_AVAILABLE = false;
	TAILNET_CONNECTED = false;

	constructor(options?: { debug?: boolean; apiKey?: string }) {
		console.log('App initialized', options);
		this.debug = options?.debug || false;
		this.apiKey = options?.apiKey || null;
		this.loop = null;
	}

	async initialize() {
		console.log('App initialization started');
		// Perform any necessary setup here, such as loading configuration, initializing state, etc.
		// await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate async initialization
		// console.log('App initialization finished')
		const result = await checkBrowserConnectivity();

		console.log('result', result);

		this.TAILNET_API_AVAILABLE = result.isConnected;

		this.client = createTailscaleClient(this.apiKey);

		if (this.TAILNET_API_AVAILABLE) {
			// this.client
		} else {
			console.warn('Tailnet API is not available in this browser');
		}
	}

	getState() {
		return {
			TAILNET_API_AVAILABLE: this.TAILNET_API_AVAILABLE,
			TAILNET_CONNECTED: this.TAILNET_CONNECTED,
			debug: this.debug,
			apiKey: this.apiKey,
		};
	}
}

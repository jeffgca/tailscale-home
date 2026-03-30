import { createTailscaleClient, checkBrowserConnectivity } from './api';

export class App {
	TAILNET_API_AVAILABLE = false;
	TAILNET_CONNECTED = false;
	timers = [];
	#_handlers = [];
	#_current = {};

	constructor(options?: { debug?: boolean; apiKey?: string }) {
		console.log('App initialized', options);

		this.#_current.debug = options?.debug || false;
		this.#_current.apiKey = options?.apiKey || null;
		this.#_current.loop = null;
		this.#_current.localIps = options?.localIps || [];
		this.#_current.devices = [];
		this.#_current.services = [];
	}

	async initialize() {
		console.log('App initialization started');
		// Perform any necessary setup here, such as loading configuration, initializing state, etc.
		// await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate async initialization
		// console.log('App initialization finished')
		const result = await checkBrowserConnectivity();

		console.log('checkBrowserConnectivity', result);

		this.TAILNET_API_AVAILABLE = result.ok === true;

		this.client = await createTailscaleClient(this.apiKey);

		if (this.TAILNET_API_AVAILABLE) {
			this.#_current.magicDnsEnabled = await this.client.magicDnsSetting();

			this.#_current.devices = await this.client.listDevices();
			this.#_current.services = await this.client.listServices();
		} else {
			console.warn('Tailnet API is not available in this browser');
		}
	}

	update(object) {
		let _current = this.getState();
		this.#_current = { ..._current, ...object };

		this.#_handlers.forEach((handler) => handler(this.getState()));
	}

	getState() {
		return this.#_current;
	}

	onUpdate(handler) {
		// This method can be called to trigger any updates needed when the state changes
		this.#_handlers.push(handler);
	}
}

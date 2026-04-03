import { createTailscaleClient, checkBrowserConnectivity } from './api';

export class App {
	TAILNET_API_AVAILABLE = false;
	TAILNET_CONNECTED = false;
	timers = [];
	#_handlers = [];
	#_current = {};
	client = null;

	constructor(options?: { debug?: boolean; apiKey?: string }) {
		console.log('App initialized', options);

		this.#_current.debug = options?.debug || false;
		this.#_current.apiKey = options?.apiKey || null;
		this.#_current.loop = null;
		this.#_current.localIps = options?.localIps || [];
		this.#_current.devices = [];
		this.#_current.services = [];
		this.#_current.status = 'disconnected';
		this.#_current.apiStatus = 'unknown';
	}

	async initialize() {
		console.log('App initialization started');
		// Perform any necessary setup here, such as loading configuration, initializing state, etc.
		// await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate async initialization
		// console.log('App initialization finished')
		const result = await checkBrowserConnectivity();

		this.#_current.apiStatus = result.ok;

		this.client = await createTailscaleClient(this.apiKey);

		if (this.#_current.apiStatus) {
			this.#_current.magicDnsEnabled = await this.client.magicDnsSetting();

			this.#_current.devices = await this.client.listDevices();
			this.#_current.services = await this.client.listServices();
		} else {
			console.warn('Tailnet API is not available in this browser');
		}
	}

	async updateDevicesAndServices() {
		if (!this.client) {
			console.warn('Tailscale client not initialized');
			return;
		}

		let _devices = await this.client.listDevices();
		let _services = await this.client.listServices();

		this.update({
			devices: this.#_current.devices,
			services: this.#_current.services,
		});
	}

	setCurrentDevice() {
		if (!this.#_current.localIps || this.#_current.localIps.length === 0) {
			return;
		}

		let devices = this.#_current.devices || [];

		this.#_current.status = 'disconnected';

		this.#_current.devices.forEach((device, i) => {
			device.isCurrent = this.#_current.localIps.includes(device.address);

			if (device.isCurrent) {
				// if any device matches local IPs, we consider the tailnet to be connected
				this.#_current.status = 'connected';
			}

			this.#_current.devices[i] = device;
		});
	}

	update(object) {
		this.setCurrentDevice();
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

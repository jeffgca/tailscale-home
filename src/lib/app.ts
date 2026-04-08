import { createTailscaleClient, checkBrowserConnectivity } from './api';

export class App {
	TAILNET_API_AVAILABLE = false;
	TAILNET_CONNECTED = false;
	timers = [];
	#_handlers = [];
	#_current = {};
	client = null;

	constructor(options?: {
		debug?: boolean;
		apiKey?: string;
		cache?: string[];
		localIps?: string[];
		tailnetCheckInterval?: number;
		deviceProbeInterval?: number;
	}) {
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
			this.#_current.services = await this.client.listServices(true);

			// this initialization takes a while so we detect the current device after explicitly
			this.setCurrentDevice();
		} else {
			console.warn('Tailnet API is not available in this browser');
		}

		console.log('XXX init', this.getState());
	}

	async updateDevicesAndServices() {
		if (!this.client) {
			console.warn('Tailscale client not initialized');
			return;
		}

		let _devices = await this.client.listDevices();
		let _services = await this.client.listServices();

		this.setCurrentDevice();

		this.update({
			devices: this.#_current.devices,
			services: this.#_current.services,
		});
	}

	setCurrentDevice() {
		if (!this.#_current.localIps || this.#_current.localIps.length === 0) {
			console.log('huh?', this.#_current.localIps);
			return;
		}

		// if ()

		this.#_current.status = 'disconnected';

		// console.log(
		// 	'ZZZ includes?',
		// 	this.#_current.localIps.includes(device.address),
		// );

		console.log('XXX devices', this.#_current.devices.length);

		if (this.#_current.devices.length === 0) {
			console.log('No devices found in tailnet');
			return;
		}

		// this.#_current.devices.forEach((device, i) => {
		// 	console.log('XXX device', device);
		// });

		this.#_current.devices.forEach((device, i) => {
			console.log('device', device);
			device.isCurrent = this.#_current.localIps.includes(device.address);

			console.log('XXX device.isCurrent', device.isCurrent, device.address);

			if (device.isCurrent) {
				// if any device matches local IPs, we consider the tailnet to be connected
				this.#_current.status = 'connected';
				this.#_current.currentDevice = device;
				console.log('Current device set to', device);
			}

			this.#_current.devices[i] = device;
		});

		console.log('setCurrentDevice', this.getState());
	}

	update(object) {
		console.log('XXX in update', object);
		let _current = this.getState();
		this.#_current = { ..._current, ...object };
		// this.setCurrentDevice();
		this.#_handlers.forEach((handler) => handler(this.getState()));
	}

	getState() {
		return this.#_current;
	}

	setLocalIps(ips) {
		this.update({ localIps: ips });
		this.setCurrentDevice();
	}

	onUpdate(handler) {
		// This method can be called to trigger any updates needed when the state changes
		this.#_handlers.push(handler);
	}
}

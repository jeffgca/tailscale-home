import { createTailscaleClient, checkBrowserConnectivity } from './api';

import { scanResponsiveHttpPorts } from './reachability';

// const openPorts = await scanResponsiveHttpPorts({
//   host: '127.0.0.1',
//   startPort: 1024,
//   endPort: 9999,
//   timeoutMs: 400,
//   concurrency: 100,
// })

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
		// console.log('App initialized', options);

		this.#_current.debug = options?.debug || false;
		this.#_current.apiKey = options?.apiKey || null;
		this.#_current.loop = null;
		this.#_current.localIps = options?.localIps || [];
		this.#_current.devices = [];
		this.#_current.services = [];
		this.#_current.servicesMetaData = {};
		this.#_current.status = 'disconnected';
		this.#_current.apiStatus = 'unknown';
	}

	async initialize() {
		console.log('App initialization started');
		// Perform any necessary setup here, such as loading configuration, initializing state, etc.
		// await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate async initialization
		// console.log('App initialization finished')
		const result = await checkBrowserConnectivity();

		console.log('XXXX check', result);

		this.#_current.apiStatus = result;

		this.client = await createTailscaleClient(this.apiKey);

		if (this.#_current.apiStatus === true) {
			this.#_current.magicDnsEnabled = await this.client.magicDnsSetting();
			this.#_current.devices = await this.client.listDevices();
			this.#_current.services = await this.client.listServices(true);

			this.#_current.serviceMetadata = {};

			// this initialization takes a while so we detect the current device after explicitly
			this.setCurrentDevice();
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

		this.setCurrentDevice();

		this.update({
			devices: this.#_current.devices,
			services: this.#_current.services,
		});
	}

	setCurrentDevice() {
		if (!this.#_current.localIps || this.#_current.localIps.length === 0) {
			console.warn('No local ip address result', this.#_current.localIps);
			return;
		}

		this.#_current.status = 'disconnected';

		if (this.#_current.devices.length === 0) {
			console.warn('No devices found in tailnet');
			return;
		}

		this.#_current.devices.forEach((device, i) => {
			device.isCurrent = this.#_current.localIps.includes(device.address);
			if (device.isCurrent) {
				// if any device matches local IPs, we consider the tailnet to be connected
				this.#_current.status = 'connected';
				this.#_current.currentDevice = device;
			}

			this.#_current.devices[i] = device;
		});
	}

	update(object) {
		let _current = this.getState();
		this.#_current = { ..._current, ...object };
		this.#_handlers.forEach((handler) => handler(this.getState()));
	}

	getState() {
		return this.#_current;
	}

	scanDevice(name) {
		let _index = this.#_current.devices.findIndex((d) => d.name === name);

		scanResponsiveHttpPorts(name)
			.then((ports) => {
				this.#_current.devices[_index].openPorts = ports;
			})
			.catch((error) => {
				console.error('Error scanning HTTP ports:', error);
			});
		return true;
	}

	setLocalIps(ips) {
		this.update({ localIps: ips });
		this.setCurrentDevice();
	}

	setSiteMetadata(url, metadata) {
		let _uri = new URL(url).origin;
		let _imageUrl = new URL(metadata.image, url).href;
		metadata.image = _imageUrl;
		this.#_current.servicesMetaData[_uri] = metadata;
		this.update();
	}

	onUpdate(handler) {
		// This method can be called to trigger any updates needed when the state changes
		this.#_handlers.push(handler);
	}
}

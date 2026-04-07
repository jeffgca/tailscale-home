import {
	getCachedServiceMetadata,
	setCachedServiceMetadata,
	tailscaleApiKey,
	tailscaleTailnet,
} from './storage';
import { fetchPageMetadata } from './service';

const TAILSCALE_API_BASE = 'https://api.tailscale.com/api/v2';
const SERVICE_METADATA_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Network connectivity status
 */
export enum ConnectivityStatus {
	/**
	 * API key not configured
	 */
	NotConfigured = 'not-configured',
	/**
	 * Connected and authenticated
	 */
	Connected = 'connected',
	/**
	 * DNS resolution failed - likely no internet or network issue
	 */
	NetworkError = 'network-error',
	/**
	 * Authentication failed - invalid or expired API key
	 */
	AuthenticationFailed = 'auth-failed',
	/**
	 * API returned an error
	 */
	ApiError = 'api-error',
	/**
	 * Unknown error
	 */
	Unknown = 'unknown',
}

/**
 * Connectivity check result
 */
export interface ConnectivityCheckResult {
	status: ConnectivityStatus;
	message: string;
	isConnected: boolean;
}

/**
 * Tailscale Device type
 */
export interface Device {
	id: string;
	nodeId: string;
	user: string;
	name: string;
	hostname: string;
	clientVersion: string;
	updateAvailable: boolean;
	os: string;
	created: string;
	connectedToControl: boolean;
	lastSeen: string;
	keyExpiryDisabled: boolean;
	expires: string;
	authorized: boolean;
	isExternal: boolean;
	addresses: string[];
	tags?: string[];
	[key: string]: any;
}

/**
 * Tailscale Service type
 */
export interface Service {
	name: string;
	addrs: string[];
	comment?: string;
	ports: string[];
	tags?: string[];
}

/**
 * Validates that an API key has the correct format
 */
export function isValidApiKeyFormat(key: string): boolean {
	return key.startsWith('tskey-api-');
}

/**
 * Tailscale API client
 */
export class TailscaleAPI {
	private apiKey: string;
	private tailnet: string;

	constructor(apiKey: string, tailnet: string = '-') {
		this.apiKey = apiKey;
		this.tailnet = tailnet;
		this.magicDnsEnabled = false;
		this.status = {};
		this.magicDnsDomain = null;
	}

	async initialize() {
		this.magicDnsEnabled = await this.magicDnsSetting();
		this.status = await this.checkConnectivity();
	}

	async magicDnsSetting() {
		let result = await this.request<{ magicDns: boolean }>(
			`/tailnet/${this.tailnet}/dns/configuration`,
		);

		console.log('magicDnsSetting result', result.preferences.magicDNS);

		return result.preferences.magicDNS || false;
	}

	/**
	 * Make an authenticated request to the Tailscale API
	 */
	private async request<T>(
		endpoint: string,
		options: RequestInit = {},
	): Promise<T> {
		const url = `${TAILSCALE_API_BASE}${endpoint}`;

		const response = await fetch(url, {
			...options,
			headers: {
				Authorization: `Bearer ${this.apiKey}`,
				'Content-Type': 'application/json',
				...options.headers,
			},
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Tailscale API error (${response.status}): ${errorText}`);
		}

		return response.json();
	}

	/**
	 * List all devices in the tailnet
	 */
	async listDevices(fields: 'all' | 'default' = 'default') {
		let devices = await this.request<{ devices: Device[] }>(
			`/tailnet/${this.tailnet}/devices?fields=${fields}`,
		);

		let _return = devices?.devices.map((device) => {
			return {
				address: device.addresses[0],
				name: device.name,
				hostname: device.hostname,
				os: device.os,
				connected: device.connectedToControl,
				lastSeen: device.lastSeen,
				tags: device.tags,
				version: device.clientVersion,
				updateAvailable: device.updateAvailable,
			};
		});

		return _return;
	}

	_getServiceUrl(service) {
		console.log(
			'_getServiceUrl',
			this.magicDnsEnabled === true,
			this.magicDnsDomain,
		);
		if (this.magicDnsEnabled === true && this.magicDnsDomain) {
			let _svcSubdomain = service.name.split(':')[1];

			let _port = service.ports[0].split(':')[1],
				scheme = 'http';

			if (_port === '443') {
				scheme = 'https';
			}

			return `${scheme}://${_svcSubdomain}.${this.magicDnsDomain}`;
		} else {
			return `http://${service.addrs[0]}`;
		}
	}

	/**
	 * List all services in the tailnet
	 */
	async listServices(forceRefreshMetadata: boolean = false) {
		let _services = await this.request<{ vipServices: Service[] }>(
			`/tailnet/${this.tailnet}/services`,
		);

		// console.log('listServices', this.magicDnsDomain, _services);

		let _return = await Promise.all(
			_services.vipServices.map(async (service) => {
				let _uri = this._getServiceUrl(service);
				// let metadata = null;
				// let cachedMetadata = await getCachedServiceMetadata(_uri);

				// const cacheIsFresh =
				// 	!forceRefreshMetadata &&
				// 	cachedMetadata !== null &&
				// 	Date.now() - new Date(cachedMetadata.cachedAt).getTime() <=
				// 		SERVICE_METADATA_CACHE_MAX_AGE_MS;

				// if (cacheIsFresh && cachedMetadata) {
				// 	metadata = cachedMetadata.metadata;
				// } else {
				// 	try {
				// 		metadata = await fetchPageMetadata(_uri);
				// 		console.log('XXX metadata', metadata);
				// 		await setCachedServiceMetadata(_uri, metadata);
				// 	} catch (error) {
				// 		console.warn(`Failed to fetch service metadata for ${_uri}`, error);

				// 		if (cachedMetadata) {
				// 			metadata = cachedMetadata.metadata;
				// 		}
				// 	}
				// }

				return {
					name: service.name,
					uri: _uri,
					addresses: service.addrs,
					ports: service.ports,
					tags: service.tags,
					comment: service.comment,
					// metadata,
					// favicon: favicon,
				};
			}),
		);

		console.log('XXX services', _return);

		return _return;
	}

	/**
	 * Test API connection by fetching devices
	 */
	async testConnection(): Promise<boolean> {
		try {
			await this.listDevices('default');
			return true;
		} catch (error) {
			console.error('Tailscale API connection test failed:', error);
			return false;
		}
	}

	/**
	 * Detailed connectivity check
	 */
	async checkConnectivity(): Promise<ConnectivityCheckResult> {
		try {
			let devices = await this.listDevices('default');

			// grab and tuck away the MagicDNS subdomain for later use in constructing service URLs
			if (devices.length > 0) {
				const firstDevice = devices[0];
				const subdomain = firstDevice.name;
				console.log('subdomain', subdomain);

				if (subdomain.endsWith('.ts.net')) {
					let magicDnsDomain = subdomain.split('.').slice(1).join('.');
					//  pieces.slice(1).join('.');
					this.magicDnsDomain = magicDnsDomain;
				}
			}

			return {
				status: ConnectivityStatus.Connected,
				message: 'Successfully connected to Tailscale API',
				isConnected: true,
			};
		} catch (error) {
			return this.analyzeError(error);
		}
	}

	/**
	 * Analyze error and return appropriate connectivity status
	 */
	private analyzeError(error: unknown): ConnectivityCheckResult {
		const errorMessage = error instanceof Error ? error.message : String(error);

		// Network/DNS errors
		if (
			errorMessage.includes('Failed to fetch') ||
			errorMessage.includes('NetworkError') ||
			errorMessage.includes('TypeError')
		) {
			return {
				status: ConnectivityStatus.NetworkError,
				message:
					'Network error: Unable to reach api.tailscale.com. Check your internet connection or network settings.',
				isConnected: false,
			};
		}

		// Authentication errors
		if (errorMessage.includes('401') || errorMessage.includes('403')) {
			return {
				status: ConnectivityStatus.AuthenticationFailed,
				message:
					'Authentication failed: Your API key may be invalid or expired. Please check your settings.',
				isConnected: false,
			};
		}

		// API errors (but successfully reached the API)
		if (errorMessage.includes('Tailscale API error')) {
			return {
				status: ConnectivityStatus.ApiError,
				message: `API Error: ${errorMessage}`,
				isConnected: false,
			};
		}

		// Unknown error
		return {
			status: ConnectivityStatus.Unknown,
			message: `Unknown error: ${errorMessage}`,
			isConnected: false,
		};
	}
}

/**
 * Create a Tailscale API client from stored credentials
 */
export async function createTailscaleClient(): Promise<TailscaleAPI | null> {
	const apiKey = await tailscaleApiKey.getValue();
	const tailnet = await tailscaleTailnet.getValue();

	if (!apiKey || !isValidApiKeyFormat(apiKey)) {
		return null;
	}

	let client = new TailscaleAPI(apiKey, tailnet);
	await client.initialize();
	return client;
}

/**
 * Check browser connectivity to Tailscale API
 * This performs a detailed connectivity check and returns status information
 */
export async function checkBrowserConnectivity(): Promise<ConnectivityCheckResult> {
	const apiKey = await tailscaleApiKey.getValue();

	if (!apiKey) {
		return {
			status: ConnectivityStatus.NotConfigured,
			message:
				'API key not configured. Please configure your Tailscale API key in settings.',
			isConnected: false,
		};
	}

	if (!isValidApiKeyFormat(apiKey)) {
		return {
			status: ConnectivityStatus.AuthenticationFailed,
			message:
				"Invalid API key format. API keys should start with 'tskey-api-'.",
			isConnected: false,
		};
	}

	let result = await fetch(`${TAILSCALE_API_BASE}/tailnet/-/devices`, {
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
		},
	});

	console.log('XXX connectivity check response', result);

	return result;
}

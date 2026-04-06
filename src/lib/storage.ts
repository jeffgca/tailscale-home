import { storage } from '#imports';
import type { PageMetadata } from './service';

export type DeviceReachabilityStatus = 'reachable' | 'unreachable' | 'unknown';

export interface DeviceReachabilityResult {
	status: DeviceReachabilityStatus;
	checkedAt: string;
	target?: string;
	detail?: string;
}

export type DeviceReachabilityMap = Record<string, DeviceReachabilityResult>;

export interface ServiceMetadataCacheEntry {
	metadata: PageMetadata;
	cachedAt: string;
}

export type ServiceMetadataCacheMap = Record<string, ServiceMetadataCacheEntry>;

/**
 * Theme preference (light or dark)
 */
export const themePreference = storage.defineItem<'light' | 'dark' | 'system'>(
	'local:themePreference',
	{
		defaultValue: 'system',
	},
);

/**
 * Tailscale API key storage
 * Format: tskey-api-xxxxx
 */
export const tailscaleApiKey = storage.defineItem<string>(
	'local:tailscaleApiKey',
	{
		defaultValue: '',
	},
);

/**
 * Tailnet identifier (optional, defaults to "-" for user's default tailnet)
 */
export const tailscaleTailnet = storage.defineItem<string>(
	'local:tailscaleTailnet',
	{
		defaultValue: '-',
	},
);

/**
 * Latest per-device reachability scan results.
 */
export const deviceReachability = storage.defineItem<DeviceReachabilityMap>(
	'local:deviceReachability',
	{
		defaultValue: {},
	},
);

/**
 * Timestamp of the latest global reachability scan.
 */
export const deviceReachabilityLastScan = storage.defineItem<string | null>(
	'local:deviceReachabilityLastScan',
	{
		defaultValue: null,
	},
);

/**
 * Local IP addresses discovered on this computer
 */
export const localIPs = storage.defineItem<string[]>('local:localIPs', {
	defaultValue: [],
});

/**
 * Timestamp of when local IPs were last discovered
 */
export const localIPsLastDiscovered = storage.defineItem<string | null>(
	'local:localIPsLastDiscovered',
	{
		defaultValue: null,
	},
);

/**
 * Interval in seconds to check if device is connected to tailnet
 */
export const tailnetCheckIntervalSeconds = storage.defineItem<number>(
	'local:tailnetCheckIntervalSeconds',
	{
		defaultValue: 30,
	},
);

/**
 * Interval in seconds to probe device reachability
 */
export const deviceProbeIntervalSeconds = storage.defineItem<number>(
	'local:deviceProbeIntervalSeconds',
	{
		defaultValue: 300, // 5 minutes
	},
);

/**
 * Cached page metadata for services, keyed by service URI.
 */
export const serviceMetadataCache = storage.defineItem<ServiceMetadataCacheMap>(
	'local:serviceMetadataCache',
	{
		defaultValue: {},
	},
);

/**
 * Read cached metadata for a given service URI.
 */
export async function getCachedServiceMetadata(
	serviceUri: string,
): Promise<ServiceMetadataCacheEntry | null> {
	const cache = await serviceMetadataCache.getValue();
	return cache[serviceUri] ?? null;
}

/**
 * Store metadata in cache for a service URI.
 */
export async function setCachedServiceMetadata(
	serviceUri: string,
	metadata: PageMetadata,
): Promise<void> {
	const cache = await serviceMetadataCache.getValue();
	cache[serviceUri] = {
		metadata,
		cachedAt: new Date().toISOString(),
	};
	await serviceMetadataCache.setValue(cache);
}

/**
 * Delete a single cached service metadata entry.
 */
export async function deleteCachedServiceMetadata(
	serviceUri: string,
): Promise<void> {
	const cache = await serviceMetadataCache.getValue();
	if (!(serviceUri in cache)) {
		return;
	}

	delete cache[serviceUri];
	await serviceMetadataCache.setValue(cache);
}

/**
 * Clear all cached service metadata entries.
 */
export async function clearServiceMetadataCache(): Promise<void> {
	await serviceMetadataCache.setValue({});
}

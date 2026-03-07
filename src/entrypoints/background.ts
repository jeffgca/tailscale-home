import {
	runAndStoreReachabilityScan,
	isCurrentDeviceIPAvailable,
} from '../lib/reachability'
import {
	getCachedLocalIPs,
	requestLocalIPDiscoveryFromPage,
} from '../lib/localIp'
import {
	tailnetCheckIntervalSeconds,
	deviceProbeIntervalSeconds,
} from '../lib/storage'

export default defineBackground(() => {
	let ipCheckIntervalId: number | null = null
	let lastIPDiscoveryRequest = 0
	let wasConnectedToTailnet: boolean | null = null // Track previous connection state
	let localIpCheckIntervalMs = 30000 // Default 30 seconds - will be loaded from storage
	let ipDiscoveryIntervalMs = 60000 // Default 1 minute - will be loaded from storage

	/**
	 * Check if current device IP is in the tailnet and run reachability scan if it is
	 */
	const checkAndRunReachabilityScan = async () => {
		try {
			// Get cached local IPs
			let localIPs = await getCachedLocalIPs()

			// Periodically request fresh IP discovery from pages
			const now = Date.now()
			if (now - lastIPDiscoveryRequest > ipDiscoveryIntervalMs) {
				console.debug('Requesting fresh local IP discovery from pages')
				const freshIPs = await requestLocalIPDiscoveryFromPage()
				if (freshIPs.length > 0) {
					localIPs = freshIPs
					lastIPDiscoveryRequest = now
				}
			}

			console.debug('Current local IPs:', localIPs)

			if (localIPs.length === 0) {
				console.debug('No local IPs available, skipping check')
				return
			}

			// Check if current device IP is available in the tailnet
			const isAvailable = await isCurrentDeviceIPAvailable(localIPs)

			console.log(
				`Device in tailnet: ${isAvailable ? 'YES' : 'NO'} (IPs: ${localIPs.join(', ')})`,
			)

			// Detect connection state changes
			const stateChanged =
				wasConnectedToTailnet !== null && wasConnectedToTailnet !== isAvailable

			if (stateChanged) {
				if (isAvailable) {
					console.log('🟢 Device CONNECTED to tailnet')
				} else {
					console.log('🔴 Device DISCONNECTED from tailnet')
				}

				// Notify any open extension pages about the state change
				try {
					await browser.runtime.sendMessage({
						type: 'TAILNET_CONNECTION_CHANGED',
						connected: isAvailable,
					})
				} catch (err) {
					// Expected error if no pages are listening - ignore
				}
			}

			wasConnectedToTailnet = isAvailable

			if (isAvailable) {
				console.log(
					'Current device IP found in tailnet, running reachability scan',
				)
				try {
					await runAndStoreReachabilityScan()
				} catch (error) {
					console.error('Reachability scan failed:', error)
				}
			} else {
				console.debug(
					'Current device IP not found in tailnet, skipping reachability scan',
				)
			}
		} catch (error) {
			console.error('Error checking device IP availability:', error)
		}
	}

	/**
	 * Start the local IP checking interval
	 */
	const startIPCheckInterval = () => {
		if (ipCheckIntervalId !== null) {
			console.debug('IP check interval already running')
			return
		}

		console.log(
			`Starting local IP check interval (every ${localIpCheckIntervalMs / 1000} seconds)`,
		)
		// Run immediately on startup
		void checkAndRunReachabilityScan()

		// Then run on interval
		ipCheckIntervalId = setInterval(() => {
			void checkAndRunReachabilityScan()
		}, localIpCheckIntervalMs) as unknown as number
	}

	/**
	 * Stop the local IP checking interval
	 */
	const stopIPCheckInterval = () => {
		if (ipCheckIntervalId !== null) {
			console.log('Stopping local IP check interval')
			clearInterval(ipCheckIntervalId)
			ipCheckIntervalId = null
		}
	}

	browser.runtime.onInstalled.addListener(async () => {
		console.log('Extension installed, loading configuration')
		// Load timer settings from storage
		localIpCheckIntervalMs =
			(await tailnetCheckIntervalSeconds.getValue()) * 1000
		ipDiscoveryIntervalMs = (await deviceProbeIntervalSeconds.getValue()) * 1000
		console.log(
			`Loaded timers: tailnet check=${localIpCheckIntervalMs / 1000}s, device probe=${ipDiscoveryIntervalMs / 1000}s`,
		)
		startIPCheckInterval()
	})

	browser.runtime.onStartup.addListener(async () => {
		console.log('Browser started, loading configuration')
		// Load timer settings from storage
		localIpCheckIntervalMs =
			(await tailnetCheckIntervalSeconds.getValue()) * 1000
		ipDiscoveryIntervalMs = (await deviceProbeIntervalSeconds.getValue()) * 1000
		console.log(
			`Loaded timers: tailnet check=${localIpCheckIntervalMs / 1000}s, device probe=${ipDiscoveryIntervalMs / 1000}s`,
		)
		startIPCheckInterval()
	})

	// Load configuration and start the interval on initial load
	;(async () => {
		localIpCheckIntervalMs =
			(await tailnetCheckIntervalSeconds.getValue()) * 1000
		ipDiscoveryIntervalMs = (await deviceProbeIntervalSeconds.getValue()) * 1000
		console.log(
			`Loaded timers: tailnet check=${localIpCheckIntervalMs / 1000}s, device probe=${ipDiscoveryIntervalMs / 1000}s`,
		)
		startIPCheckInterval()
	})()

	// Open or switch to the tab page when the extension button is clicked
	browser.action.onClicked.addListener(async () => {
		const tabUrl = browser.runtime.getURL('/tab.html')

		// Query all tabs to find if one with our page is already open
		const tabs = await browser.tabs.query({})
		const existingTab = tabs.find((tab) => tab.url === tabUrl)

		if (existingTab && existingTab.id) {
			// Tab already open - switch to it
			await browser.tabs.update(existingTab.id, { active: true })
			// Also bring the window to focus if the tab is in a different window
			if (existingTab.windowId) {
				await browser.windows.update(existingTab.windowId, { focused: true })
			}
		} else {
			// Tab not open - create a new one
			await browser.tabs.create({
				url: tabUrl,
			})
		}
	})
})

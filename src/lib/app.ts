import { createTailscaleClient, checkBrowserConnectivity } from './api'

export class App {
	TAILNET_API_AVAILABLE = false
	TAILNET_CONNECTED = false

	constructor(options?: { debug?: boolean }) {
		console.log('App initialized', options)
		this.debug = options?.debug || false
	}

	async initialize() {
		console.log('App initialization started')
		// Perform any necessary setup here, such as loading configuration, initializing state, etc.
		// await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate async initialization
		// console.log('App initialization finished')
		const result = await checkBrowserConnectivity()
		this.TAILNET_API_AVAILABLE = result.apiAvailable
		// this.TAILNET_CONNECTED = result.connected
		console.log('Browser connectivity check result:', result)
	}
}

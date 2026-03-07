import { mount } from 'svelte'
import './app.css'
import App from './Options.svelte'
import { discoverAndStoreLocalIPs } from '../../lib/localIp'

const app = mount(App, {
	target: document.getElementById('app')!,
})

// Handle local IP discovery requests from background script
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.type === 'DISCOVER_LOCAL_IPS') {
		discoverAndStoreLocalIPs(5000)
			.then((ips) => {
				sendResponse({ success: true, ips })
			})
			.catch((error) => {
				console.error('Failed to discover local IPs:', error)
				sendResponse({ success: false, error: error.message })
			})
		// Return true to indicate we'll send response asynchronously
		return true
	}
})

// Automatically trigger discovery when page loads
discoverAndStoreLocalIPs(5000).catch((error) => {
	console.error('Auto-discovery of local IPs failed:', error)
})

export default app

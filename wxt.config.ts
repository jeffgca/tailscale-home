import { defineConfig } from 'wxt'

// See https://wxt.dev/api/config.html
export default defineConfig({
	srcDir: 'src',
	modules: ['@wxt-dev/module-svelte'],
	manifest: {
		host_permissions: ['*://api.tailscale.com/api/v2/*', '*://*/*'],
		permissions: ['storage', 'tabs', 'activeTab', 'alarms'],
		action: {
			default_title: 'Open Tailscale Home',
			// No default_popup - clicking the button will be handled by the background script
		},
	},
})

import { defineConfig } from 'wxt'
import tailwindcss from '@tailwindcss/vite'

// WEB_RTC

// See https://wxt.dev/api/config.html
export default defineConfig({
	srcDir: 'src',
	modules: ['@wxt-dev/module-svelte'],
	manifest: {
		host_permissions: ['*://api.tailscale.com/api/v2/*', '*://*/*'],
		permissions: ['storage', 'tabs', 'activeTab', 'alarms', 'offscreen'],
		action: {
			default_title: 'Open Tailscale Home',
			// No default_popup - clicking the button will be handled by the background script
		},
	},
	vite: () => ({
		plugins: [tailwindcss()],
	}),
})

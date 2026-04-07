import { defineConfig } from 'wxt';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';

// WEB_RTC

// See https://wxt.dev/api/config.html
export default defineConfig({
	srcDir: 'src',
	modules: ['@wxt-dev/module-svelte'],
	manifest: {
		host_permissions: ['*://api.tailscale.com/api/v2/*', '*://*/*'],
		permissions: [
			'storage',
			'tabs',
			'activeTab',
			'alarms',
			'offscreen',
			'scripting',
			'declarativeNetRequestWithHostAccess',
		],
		action: {
			default_title: 'Open Tailscale Home',
			// No default_popup - clicking the button will be handled by the background script
		},
	},
	svelte: {
		vite: {
			compilerOptions: {
				experimental: {
					async: true,
				},
			},
		},
	},
	vite: () => ({
		plugins: [tailwindcss()],
	}),
});

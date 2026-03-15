import { storage } from '#imports';
import { App } from '../../lib/app';
import { registerService } from '@webext-core/proxy-service';
import { APP_KEY } from './proxy_keys';
const IS_FIREFOX = import.meta.env.BROWSER === 'firefox';

export default defineBackground(() => {
	let apiKey = null;
	let tailnetCheckInterval = null;
	let deviceProbeInterval = null;

	// define storage items

	const tailscaleApiKey = storage.defineItem<string>('local:tailscaleApiKey', {
		defaultValue: '',
	});

	/**
	 * Interval in seconds to check if device is connected to tailnet
	 */
	const tailnetCheckIntervalSeconds = storage.defineItem<number>(
		'local:tailnetCheckIntervalSeconds',
		{
			defaultValue: 30,
		},
	);

	/**
	 * Interval in seconds to probe device reachability
	 */
	const deviceProbeIntervalSeconds = storage.defineItem<number>(
		'local:deviceProbeIntervalSeconds',
		{
			defaultValue: 300, // 5 minutes
		},
	);

	/**
	 * browser action click handler to open or focus the extension's main page (tab.html)
	 */
	browser.action.onClicked.addListener(async () => {
		const tabUrl = browser.runtime.getURL('/tab.html');
		// Query all tabs to find if one with our page is already open
		const tabs = await browser.tabs.query({});
		const existingTab = tabs.find((tab) => tab.url === tabUrl);
		if (existingTab && existingTab.id) {
			// Tab already open - switch to it
			await browser.tabs.update(existingTab.id, { active: true });
			// Also bring the window to focus if the tab is in a different window
			if (existingTab.windowId) {
				await browser.windows.update(existingTab.windowId, { focused: true });
			}
		} else {
			// Tab not open - create a new one
			await browser.tabs.create({
				url: tabUrl,
			});
		}
	});

	// Initialize the app

	// (async () => {
	// 	apiKey = await tailscaleApiKey.getValue();
	// 	const app = new App({ debug: IS_FIREFOX, apiKey: apiKey });

	// 	// console.log('apiKey', apiKey)

	// 	await app.initialize();

	// 	registerService(APP_KEY, app);
	// })();

	tailscaleApiKey.getValue().then((apiKey) => {
		// api
		const app = new App({ debug: IS_FIREFOX, apiKey: apiKey });
		app.initialize().then(() => {
			registerService(APP_KEY, app);
		});
	});

	// console.log('apiKey', apiKey)
});

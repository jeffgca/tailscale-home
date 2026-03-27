import { storage } from '#imports';
import { App } from '../../lib/app';
import { registerService } from '@webext-core/proxy-service';
import { APP_KEY } from './proxy_keys';
const IS_FIREFOX = import.meta.env.BROWSER === 'firefox';
import { getIps } from '../../lib/localip.ts';

async function getLocalIpsWrapper() {
	if (IS_FIREFOX) {
		console.log('IS_FIREFOX', IS_FIREFOX);
		return getIps();
	} else {
		return new Promise((resolve) => {
			const listener = (message) => {
				if (message.type === 'LOCAL_IPS') {
					console.log('local network interface', ips);
					resolve(message.ips);
					browser.runtime.onMessage.removeListener(listener);
				}
			};
			browser.runtime.onMessage.addListener(listener);
			try {
				browser.runtime.sendMessage({ type: 'GET_LOCAL_IPS' }, (response) => {
					console.log('got here???', response);
				});
			} catch (error) {
				console.error('Error sending message to offscreen:', error);
				resolve([]);
				// browser.runtime.onMessage.removeListener(listener);
			}
		});
	}
}

export default defineBackground(() => {
	let apiKey = null;
	let tailnetCheckInterval = null;
	let deviceProbeInterval = null;

	let localIps = [];

	if (!IS_FIREFOX) {
		console.log('Running in Firefox');

		console.log('Running in something chrome-ish, I guess. Safari?');

		browser.offscreen.createDocument({
			url: '/offscreen.html',
			reasons: ['WEB_RTC'],
			justification: 'Discover local IP addresses using WebRTC',
		});

		// initial value of local ips
		getLocalIpsWrapper()
			.then((ips) => {
				// console.log('Initial local IPs found:', ips);
				localIps = ips;
				console.log('localips', localIps);
			})
			.catch((error) => {
				console.error('Error getting local IPs:', error);
			});
	}

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

	Promise.all([
		tailscaleApiKey.getValue(),
		tailnetCheckIntervalSeconds.getValue(),
		deviceProbeIntervalSeconds.getValue(),
	]).then(([apiKey, tailnetCheckInterval, deviceProbeInterval]) => {
		console.log('XXX', apiKey, tailnetCheckInterval, deviceProbeInterval);

		const app = new App({
			debug: IS_FIREFOX,
			apiKey,
			localIps,
			tailnetCheckInterval,
			deviceProbeInterval,
		});

		app.initialize().then(() => {
			registerService(APP_KEY, app);
		});
	});

	// tailscaleApiKey.getValue().then(async (apiKey) => {
	// 	// api

	// 	let timers = {
	// 		tailnetCheckInterval: await tailnetCheckIntervalSeconds.getValue(),
	// 		deviceProbeInterval: await deviceProbeIntervalSeconds.getValue(),
	// 	};

	// 	console.log('XXX', apiKey, timers);
	// });

	// console.log('apiKey', apiKey)
});

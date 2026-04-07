import { storage } from '#imports';
import { App } from '../../lib/app';
import { registerService } from '@webext-core/proxy-service';
import { APP_KEY } from './proxy_keys';
const IS_FIREFOX = import.meta.env.BROWSER === 'firefox';
import { getIps } from '../../lib/localip';
import { setupOffscreenDocument } from '../../lib/offscreen';

let iframeHosts = ['home.gibbon-snake.ts.net'];

const RULE = {
	id: 1,
	condition: {
		initiatorDomains: [chrome.runtime.id],
		requestDomains: iframeHosts,
		resourceTypes: ['sub_frame'],
	},
	action: {
		type: 'modifyHeaders',
		responseHeaders: [
			{ header: 'X-Frame-Options', operation: 'remove' },
			{ header: 'Frame-Options', operation: 'remove' },
			// Uncomment the following line to suppress `frame-ancestors` error
			// {header: 'Content-Security-Policy', operation: 'remove'},
		],
	},
};

/**
 * TODO:
 *
 * - sv-router for urls -> tabs
 * - update current device in devices should be pushed from background when tailscale is enabled / disabled
 */

export default defineBackground(() => {
	// magic voodoo that allegedly helps us load iframes without security problems
	chrome.declarativeNetRequest.updateDynamicRules({
		removeRuleIds: [RULE.id],
		addRules: [RULE],
	});

	let apiKey = null;
	let tailnetCheckInterval = null;
	let deviceProbeInterval = null;

	let localIps = [];

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

	// Initialize the app
	let app = null;

	Promise.all([
		tailscaleApiKey.getValue(),
		tailnetCheckIntervalSeconds.getValue(),
		deviceProbeIntervalSeconds.getValue(),
	]).then(([apiKey, tailnetCheckInterval, deviceProbeInterval]) => {
		// console.log('XXX', apiKey, tailnetCheckInterval, deviceProbeInterval);

		app = new App({
			debug: IS_FIREFOX,
			apiKey,
			localIps,
			tailnetCheckInterval,
			deviceProbeInterval,
		});

		app.initialize().then(() => {
			app.onUpdate((state) => {
				// console.log('App state updated:', state);
				browser.runtime.sendMessage({
					type: 'APP_STATE_UPDATE',
					state,
				});
			});
			registerService(APP_KEY, app);

			setInterval(() => {
				// console.log('deviceProbeInterval');
			}, deviceProbeInterval);

			setTimeout(() => {
				console.log('tailnetCheckInterval');
				browser.runtime
					.sendMessage({ type: 'GET_LOCAL_IPS', target: 'offscreen' })
					.catch((error) => {
						console.error('Error getting local IPs:', error);
					});
			}, tailnetCheckInterval);
		});

		// console.log('services?', app.services);
	});

	setupOffscreenDocument('/offscreen.html')
		.then((result) => {
			// console.log('Offscreen document setup result:', result);
			// initial value of local ips
			browser.runtime.onMessage.addListener((message) => {
				console.log('XXX background message', message.type);
				if (message.type === 'LOCAL_IPS') {
					// console.log('Received local IPs from offscreen:', message.ips);
					app.update({ localIps: message.ips });
				}

				if (message.type === 'iframe-metadata') {
					console.log(
						'XXX Received ping message in background script:',
						message,
					);
				}
			});

			browser.runtime
				.sendMessage({ type: 'GET_LOCAL_IPS', target: 'offscreen' })
				.catch((error) => {
					console.error('Error getting local IPs:', error);
				});

			browser.runtime
				.sendMessage({
					type: 'PING',
					target: 'content-script',
				})
				.then((response) => {
					console.log('got response to ping', response);
				})
				.catch((error) => {
					console.error('Error sending ping message:', error);
				});
		})
		.catch((error) => {
			console.error('Error setting up offscreen document:', error);
		});

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
});

import { storage } from '#imports';
import { App } from '../../lib/app';
import { registerService } from '@webext-core/proxy-service';
import { APP_KEY } from './proxy_keys';
const IS_FIREFOX = import.meta.env.BROWSER === 'firefox';
import { getIps } from '../../lib/localip';
import { setupOffscreenDocument } from '../../lib/offscreen';
import {
	getCachedServiceMetadata,
	setCachedServiceMetadata,
} from '../../lib/storage';

let iframeHosts = [];

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
			{ header: 'Content-Security-Policy', operation: 'remove' },
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
	// chrome.declarativeNetRequest.updateDynamicRules({
	// 	removeRuleIds: [RULE.id],
	// 	addRules: [RULE],
	// });

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
	let app = null,
		loop;

	Promise.all([
		tailscaleApiKey.getValue(),
		tailnetCheckIntervalSeconds.getValue(),
		deviceProbeIntervalSeconds.getValue(),
	]).then(([apiKey, tailnetCheckInterval, deviceProbeInterval]) => {
		clearInterval(loop);

		// console.log('XXX', cachedMetadata);

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

			let _state = app.getState();
			// console.log('state', _state);

			browser.runtime.onMessage.addListener((message) => {
				if (message.type === 'service-metadata') {
					console.log(
						'Received service-metadata message in background script',
						message.data,
					);

					app.setSiteMetadata(message.data.url, message.data);
				}
			});

			let _serviceUrls = _state.services.map((s) => s.uri);

			console.log('XXXX', _serviceUrls);

			let _serviceHosts = _serviceUrls
				.map((url) => {
					try {
						return new URL(url).host;
					} catch (error) {
						console.error('Error parsing service URL:', url, error);
						return null;
					}
				})
				.filter(Boolean);

			/**
			 * _serviceHosts is empty wtf
			 */
			RULE.condition.requestDomains = _serviceHosts;

			if (_serviceHosts.length > 0) {
				chrome.declarativeNetRequest.updateDynamicRules({
					removeRuleIds: [RULE.id],
					addRules: [RULE],
				});
			}

			// see if we have cached Metadata for these services and if so set it in the app state so it's immediately available to the UI

			Promise.all(
				_serviceHosts.map((host) => {
					return getCachedServiceMetadata(host);
				}),
			).then((cachedMetadataArray) => {
				cachedMetadataArray.forEach((metadata, index) => {
					// console.log('XXX', metadata, _serviceUrls[index]);
					if (metadata) {
						app.setSiteMetadata(_serviceUrls[index], metadata.metadata);
					} else {
						browser.runtime
							.sendMessage({
								type: 'IFRAME_METADATA',
								target: 'offscreen',
								data: _serviceUrls,
							})
							.catch((error) => {
								console.error('Error sending ping message:', error);
							})
							.then((response) => {
								// console.log('In IFRAME_METADATA then', response);
								browser.runtime.sendMessage({
									type: 'get-service-metadata',
									target: 'content-scripts',
								});
							});
					}
				});
			});
		});

		setupOffscreenDocument('/offscreen.html')
			.then((result) => {
				console.log('Offscreen document setup');
				// initial value of local ips
				browser.runtime.onMessage.addListener((message) => {
					if (message.type === 'LOCAL_IPS') {
						// console.log('Received local IPs from offscreen:', message.ips);
						app.setLocalIps(message.ips);
					}

					if (
						message.type === 'iframe-metadata' &&
						message.source === 'offscreen'
					) {
						console.log(
							'XXX Received iframe-metadata message in background script:',
							message,
						);
					}

					if (message.type === 'get-service-metadata') {
						console.log(
							'Received GET_PAGE_METADATA message in background script',
							message,
						);
					}
				});

				// set the loop
				loop = setInterval(() => {
					browser.runtime
						.sendMessage({ type: 'GET_LOCAL_IPS', target: 'offscreen' })
						.catch((error) => {
							console.error('Error getting local IPs:', error);
						});
				}, 300);

				browser.runtime
					.sendMessage({ type: 'GET_LOCAL_IPS', target: 'offscreen' })
					.catch((error) => {
						console.error('Error getting local IPs:', error);
					});

				// let _serviceUrls = app.services.map((s) => s.url);
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
					await browser.windows.update(existingTab.windowId, {
						focused: true,
					});
				}
			} else {
				// Tab not open - create a new one
				await browser.tabs.create({
					url: tabUrl,
				});
			}
		});

		// console.log('services?', app.services);
	});
});

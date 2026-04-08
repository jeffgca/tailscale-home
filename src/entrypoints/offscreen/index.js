// console.log('in the offscreen page script')
import { getIps } from '../../lib/localip';

browser.runtime.onMessage.addListener((message) => {
	// console.log('message received in offscreen page', message);

	if (message.target && message.target !== 'offscreen') {
		return;
	}

	if (message.type === 'GET_LOCAL_IPS') {
		getIps()
			.then((ips) => {
				console.log('IPs found in offscreen', ips);
				browser.runtime.sendMessage({
					type: 'LOCAL_IPS',
					ips,
				});
			})
			.catch((err) => {
				console.error('Error getting IPs in offscreen page:', err);
			});
	} else if (message.type === 'PING') {
		console.log('Received ping message in offscreen page');
		browser.runtime
			.sendMessage({
				type: 'PONG',
				target: 'background',
			})
			.then((response) => {
				console.log('got response to pong', response);
			})
			.catch((error) => {
				console.error('Error sending pong message:', error);
			});
	} else if (message.type === 'IFRAME_METADATA') {
		console.log(
			'Received iframe-metadata message in offscreen page:',
			message.data,
		);
		// You can store this metadata in a variable or use it as needed
	}
});

document.addEventListener('DOMContentLoaded', () => {
	console.log('Offscreen document loaded');
});

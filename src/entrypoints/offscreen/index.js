// console.log('in the offscreen page script')
import { getIps } from '../../lib/localip';

getIps()
	.then((ips) => {
		// console.log('IPs found in offscreen
		browser.runtime.sendMessage({
			type: 'LOCAL_IPS',
			ips,
		});
	})
	.catch((err) => {
		console.error('Error getting IPs in offscreen page:', err);
	});

// browser.runtime.onMessage.addListener((message, sendResponse) => {
// 	if (message.type === 'GET_LOCAL_IPS') {
// 		getIps().then((ips) => {
// 			sendResponse({ ips });
// 		});
// 	}
// });

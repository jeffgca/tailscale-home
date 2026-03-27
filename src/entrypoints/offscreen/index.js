// console.log('in the offscreen page script')
import { getIps } from '../../lib/localip';

browser.runtime.onMessage.addListener((message) => {
	console.log('message received in offscreen page', message);

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
	}
});

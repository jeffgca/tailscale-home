export async function getIps() {
	return new Promise((resolve, reject) => {
		const ips = [];

		const RTCPeerConnection =
			window.RTCPeerConnection ||
			window.webkitRTCPeerConnection ||
			window.mozRTCPeerConnection;

		if (!RTCPeerConnection) {
			reject(
				new Error(
					'WebRTC is not supported in this browser / script / environment',
				),
			);
			return;
		}

		const pc = new RTCPeerConnection({
			// Don't specify any stun/turn servers, otherwise you will
			// also find your public IP addresses.
			iceServers: [],
		});

		// Add a media line, this is needed to activate candidate gathering.
		pc.createDataChannel('');

		// onicecandidate is triggered whenever a candidate has been found.
		pc.onicecandidate = (e) => {
			if (!e.candidate) {
				// Candidate gathering completed.
				pc.close();
				// console.log('ips', ips);
				resolve(ips);
				return;
			}

			try {
				const ipMatch = /^candidate:.+ (\S+) \d+ typ/.exec(
					e.candidate.candidate,
				);
				if (ipMatch && ipMatch[1]) {
					const ip = ipMatch[1];
					if (!ips.includes(ip)) {
						// avoid duplicate entries (tcp/udp)
						ips.push(ip);
					}
				}
			} catch (error) {
				console.error('Error parsing ICE candidate:', error);
			}
		};

		pc.createOffer(
			(sdp) => {
				pc.setLocalDescription(sdp);
			},
			(error) => {
				console.error('Error creating offer:', error);
				pc.close();
				console.log('in createOffer', ips);
				resolve(ips);
			},
		);
	});
}

// let ips = await getIps()
// console.log('IPs found:', ips)

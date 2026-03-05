import { localIPs, localIPsLastDiscovered } from "./storage";

/**
 * Check if code is running in a context with window object (not a service worker)
 */
export function hasWindowContext(): boolean {
  return typeof window !== "undefined";
}

/**
 * Get local IP addresses of the current computer using WebRTC
 * This discovers local IP addresses without using STUN/TURN servers
 * Only works in contexts with a window object (content scripts, pages, etc.)
 * @returns Promise resolving to an array of local IP addresses
 */
export async function getLocalIPs(): Promise<string[]> {
  return new Promise((resolve) => {
    // Check if we have window context
    if (typeof window === "undefined") {
      console.warn("getLocalIPs called in non-window context (e.g., service worker). Use discoverAndStoreLocalIPs from a page context instead.");
      resolve([]);
      return;
    }

    const ips: string[] = [];

    const RTCPeerConnection = window.RTCPeerConnection || (window as any).webkitRTCPeerConnection || (window as any).mozRTCPeerConnection;

    if (!RTCPeerConnection) {
      // RTCPeerConnection not available
      resolve([]);
      return;
    }

    const pc = new RTCPeerConnection({
      // Don't specify any stun/turn servers, otherwise you will
      // also find your public IP addresses.
      iceServers: [],
    });

    // Add a media line, this is needed to activate candidate gathering.
    pc.createDataChannel("");

    // onicecandidate is triggered whenever a candidate has been found.
    pc.onicecandidate = (e: RTCPeerConnectionIceEvent) => {
      if (!e.candidate) {
        // Candidate gathering completed.
        pc.close();
        resolve(ips);
        return;
      }

      try {
        const ipMatch = /^candidate:.+ (\S+) \d+ typ/.exec(e.candidate.candidate);
        if (ipMatch && ipMatch[1]) {
          const ip = ipMatch[1];
          if (!ips.includes(ip)) {
            // avoid duplicate entries (tcp/udp)
            ips.push(ip);
          }
        }
      } catch (error) {
        console.error("Error parsing ICE candidate:", error);
      }
    };

    pc.createOffer(
      (sdp: RTCSessionDescriptionInit) => {
        pc.setLocalDescription(sdp);
      },
      (error: DOMException) => {
        console.error("Error creating offer:", error);
        pc.close();
        resolve(ips);
      },
    );
  });
}

/**
 * Get local IP addresses with a timeout
 * @param timeoutMs Timeout in milliseconds (default: 5000)
 * @returns Promise resolving to local IP addresses or empty array on timeout
 */
export async function getLocalIPsWithTimeout(timeoutMs = 5000): Promise<string[]> {
  return Promise.race([getLocalIPs(), new Promise<string[]>((resolve) => setTimeout(() => resolve([]), timeoutMs))]);
}

/**
 * Discover and store local IP addresses
 * Only works in contexts with a window object (content scripts, pages, etc.)
 * @param timeoutMs Timeout in milliseconds (default: 5000)
 * @returns Promise resolving to discovered local IP addresses
 */
export async function discoverAndStoreLocalIPs(timeoutMs = 5000): Promise<string[]> {
  if (!hasWindowContext()) {
    console.warn("discoverAndStoreLocalIPs called in non-window context. Local IP discovery is only available in page/content script contexts.");
    return [];
  }

  try {
    const ips = await getLocalIPsWithTimeout(timeoutMs);
    await localIPs.setValue(ips);
    await localIPsLastDiscovered.setValue(new Date().toISOString());
    return ips;
  } catch (error) {
    console.error("Error discovering local IPs:", error);
    return [];
  }
}

/**
 * Get cached local IP addresses
 * @returns Array of cached local IP addresses
 */
export async function getCachedLocalIPs(): Promise<string[]> {
  return (await localIPs.getValue()) ?? [];
}

/**
 * Get local IP addresses, using cache if available
 * @param cacheValidityMs Cache validity in milliseconds (default: 60000 = 1 minute)
 * @returns Promise resolving to local IP addresses
 */
export async function getLocalIPsOrCached(cacheValidityMs = 60000): Promise<string[]> {
  const lastDiscovered = await localIPsLastDiscovered.getValue();
  const now = Date.now();

  if (lastDiscovered && now - new Date(lastDiscovered).getTime() < cacheValidityMs) {
    return getCachedLocalIPs();
  }

  return discoverAndStoreLocalIPs();
}

/**
 * Request local IP discovery from a page context
 * This is used when running in a service worker context to request discovery from a page
 * @returns Promise resolving to discovered IPs or empty array if no page is available
 */
export async function requestLocalIPDiscoveryFromPage(): Promise<string[]> {
  if (hasWindowContext()) {
    // We're already in a page context, use direct discovery
    return discoverAndStoreLocalIPs();
  }

  try {
    // Try to send a message to any open tab/page to perform discovery
    const response = await browser.runtime.sendMessage({
      type: "DISCOVER_LOCAL_IPS",
    });

    if (response?.success) {
      return response.ips || [];
    }
  } catch (error) {
    // Expected error when no extension pages are open - don't log as warning
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (!errorMessage.includes("Receiving end does not exist")) {
      console.warn("Could not request local IP discovery from any open page:", error);
    }
  }

  // Return cached IPs if message failed (or if no pages are listening)
  return getCachedLocalIPs();
}

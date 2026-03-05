import { runAndStoreReachabilityScan, isCurrentDeviceIPAvailable } from "../lib/reachability";
import { getCachedLocalIPs, requestLocalIPDiscoveryFromPage } from "../lib/localIp";

const LOCAL_IP_CHECK_INTERVAL_MS = 30000; // 30 seconds

export default defineBackground(() => {
  let ipCheckIntervalId: number | null = null;

  /**
   * Check if current device IP is in the tailnet and run reachability scan if it is
   */
  const checkAndRunReachabilityScan = async () => {
    try {
      // Try to get local IPs (either cached or request fresh)
      let localIPs = await getCachedLocalIPs();

      // If no cached IPs, try to request discovery from an open page
      if (localIPs.length === 0) {
        localIPs = await requestLocalIPDiscoveryFromPage();
      }

      console.debug("Checking local IPs:", localIPs);

      // Check if current device IP is available in the tailnet
      const isAvailable = await isCurrentDeviceIPAvailable(localIPs);

      if (isAvailable) {
        console.log("Current device IP found in tailnet, running reachability scan");
        try {
          await runAndStoreReachabilityScan();
        } catch (error) {
          console.error("Reachability scan failed:", error);
        }
      } else {
        console.debug("Current device IP not found in tailnet, skipping reachability scan");
      }
    } catch (error) {
      console.error("Error checking device IP availability:", error);
    }
  };

  /**
   * Start the local IP checking interval
   */
  const startIPCheckInterval = () => {
    if (ipCheckIntervalId !== null) {
      console.debug("IP check interval already running");
      return;
    }

    console.log("Starting local IP check interval (every 30 seconds)");
    // Run immediately on startup
    void checkAndRunReachabilityScan();

    // Then run on interval
    ipCheckIntervalId = setInterval(() => {
      void checkAndRunReachabilityScan();
    }, LOCAL_IP_CHECK_INTERVAL_MS) as unknown as number;
  };

  /**
   * Stop the local IP checking interval
   */
  const stopIPCheckInterval = () => {
    if (ipCheckIntervalId !== null) {
      console.log("Stopping local IP check interval");
      clearInterval(ipCheckIntervalId);
      ipCheckIntervalId = null;
    }
  };

  browser.runtime.onInstalled.addListener(async () => {
    console.log("Extension installed, starting IP check interval");
    startIPCheckInterval();
  });

  browser.runtime.onStartup.addListener(async () => {
    console.log("Browser started, starting IP check interval");
    startIPCheckInterval();
  });

  // Start the interval on initial load
  startIPCheckInterval();

  // Open or switch to the tab page when the extension button is clicked
  browser.action.onClicked.addListener(async () => {
    const tabUrl = browser.runtime.getURL("/tab.html");

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

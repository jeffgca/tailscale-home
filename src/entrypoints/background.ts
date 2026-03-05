import { REACHABILITY_ALARM_NAME, REACHABILITY_SCAN_PERIOD_MINUTES, runAndStoreReachabilityScan } from "../lib/reachability";

export default defineBackground(() => {
  const runScan = async () => {
    try {
      await runAndStoreReachabilityScan();
    } catch (error) {
      console.error("Reachability scan failed", error);
    }
  };

  const ensureAlarm = async () => {
    await browser.alarms.create(REACHABILITY_ALARM_NAME, {
      delayInMinutes: REACHABILITY_SCAN_PERIOD_MINUTES,
      periodInMinutes: REACHABILITY_SCAN_PERIOD_MINUTES,
    });
  };

  browser.runtime.onInstalled.addListener(async () => {
    await ensureAlarm();
    await runScan();
  });

  browser.runtime.onStartup.addListener(async () => {
    await ensureAlarm();
    await runScan();
  });

  browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === REACHABILITY_ALARM_NAME) {
      await runScan();
    }
  });

  void ensureAlarm();
  void runScan();

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

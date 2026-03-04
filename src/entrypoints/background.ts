export default defineBackground(() => {
  console.log("Hello background!", { id: browser.runtime.id });

  // Open the tab page when the extension button is clicked
  browser.action.onClicked.addListener(() => {
    browser.tabs.create({
      url: browser.runtime.getURL("/tab.html"),
    });
  });
});

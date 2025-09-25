export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    console.log('WXT Content script loaded on:', window.location.href);

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('Content script received message:', request);

      if (request.type === 'ACTIVATE_OVERLAY') {
        console.log('Activating overlay...');
        // TODO: Create React overlay with Shadow DOM
        alert('WXT content script activated! (Phase 1 test)');
        sendResponse({ success: true });
        return true;
      }

      return false;
    });
  },
});
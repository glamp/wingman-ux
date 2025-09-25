export default defineBackground(() => {
  console.log('Background script started with WXT!');

  // Extension icon click handler
  chrome.action.onClicked.addListener((tab) => {
    console.log('Extension icon clicked');
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'ACTIVATE_OVERLAY' })
        .catch((error) => console.error('Failed to send message:', error));
    }
  });

  // Keyboard shortcut handler
  chrome.commands.onCommand.addListener((command) => {
    console.log('Keyboard shortcut pressed:', command);
    if (command === 'activate-overlay') {
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (tab?.id) {
          chrome.tabs.sendMessage(tab.id, { type: 'ACTIVATE_OVERLAY' })
            .catch((error) => console.error('Failed to send message:', error));
        }
      });
    }
  });

  // Message handler for communication with popup and content scripts
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received message:', request.type);

    // Handle screenshot capture
    if (request.type === 'CAPTURE_SCREENSHOT') {
      chrome.tabs.captureVisibleTab({ format: 'png' })
        .then((dataUrl) => {
          sendResponse(dataUrl);
        })
        .catch((error) => {
          console.error('Screenshot failed:', error);
          sendResponse(null);
        });
      return true; // Will respond asynchronously
    }

    return false;
  });
});
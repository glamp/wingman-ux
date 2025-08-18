document.addEventListener('DOMContentLoaded', async () => {
  const relayUrlInput = document.getElementById('relayUrl') as HTMLInputElement;
  const activateButton = document.getElementById('activate') as HTMLButtonElement;
  const saveButton = document.getElementById('save') as HTMLButtonElement;
  const statusDiv = document.getElementById('status') as HTMLDivElement;

  // Load saved settings
  const { relayUrl = 'http://localhost:8787' } = await chrome.storage.local.get('relayUrl');
  relayUrlInput.value = relayUrl;

  activateButton.addEventListener('click', async () => {
    console.log('[Wingman Popup] Activate button clicked');
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab?.id) {
      showStatus('No active tab found', 'error');
      return;
    }

    if (!tab.url) {
      showStatus('Cannot access this page', 'error');
      return;
    }

    // Check if it's a restricted page
    if (tab.url.startsWith('chrome://') || 
        tab.url.startsWith('chrome-extension://') ||
        tab.url.startsWith('https://chrome.google.com/webstore') ||
        tab.url === 'chrome://newtab/') {
      showStatus('Wingman cannot run on Chrome system pages. Please navigate to a regular website.', 'error');
      return;
    }

    try {
      console.log('[Wingman Popup] Sending message to tab:', tab.id, tab.url);
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'ACTIVATE_OVERLAY' });
      console.log('[Wingman Popup] Response:', response);
      
      if (response?.success) {
        showStatus('Overlay activated! Switch to your tab.', 'success');
        setTimeout(() => window.close(), 1000);
      } else if (response?.reason === 'already_active') {
        showStatus('Overlay is already active', 'error');
      } else {
        showStatus('Failed to activate overlay', 'error');
      }
    } catch (error) {
      console.error('[Wingman Popup] Error:', error);
      showStatus('Failed to activate. Make sure you\'re on a regular webpage.', 'error');
    }
  });

  saveButton.addEventListener('click', async () => {
    const relayUrl = relayUrlInput.value.trim() || 'http://localhost:8787';
    
    try {
      await chrome.storage.local.set({ relayUrl });
      showStatus('Settings saved!', 'success');
    } catch (error) {
      showStatus('Failed to save settings', 'error');
    }
  });

  function showStatus(message: string, type: 'success' | 'error') {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    
    setTimeout(() => {
      statusDiv.className = 'status';
    }, 3000);
  }
});
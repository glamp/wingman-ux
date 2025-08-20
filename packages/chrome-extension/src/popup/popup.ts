document.addEventListener('DOMContentLoaded', async () => {
  const relayUrlInput = document.getElementById('relayUrl') as HTMLInputElement;
  const activateItem = document.getElementById('activateItem') as HTMLDivElement;
  const helpItem = document.getElementById('helpItem') as HTMLDivElement;
  const statusDiv = document.getElementById('status') as HTMLDivElement;
  const connectionDot = document.getElementById('connectionDot') as HTMLDivElement;
  const connectionText = document.getElementById('connectionText') as HTMLSpanElement;
  const showPreviewUrlCheckbox = document.getElementById('showPreviewUrl') as HTMLInputElement;

  let saveTimeout: number | null = null;

  // Load saved settings
  const { relayUrl = 'http://localhost:8787', showPreviewUrl = true } = await chrome.storage.local.get(['relayUrl', 'showPreviewUrl']);
  relayUrlInput.value = relayUrl;
  showPreviewUrlCheckbox.checked = showPreviewUrl;

  // Initialize connection status check
  checkConnectionStatus();

  // Dock item interactions
  activateItem.addEventListener('click', async () => {
    const activateIcon = activateItem.querySelector('.dock-icon') as HTMLDivElement;
    
    console.log('[Wingman Popup] Activate button clicked');
    
    // Morph to targeting state
    activateIcon.textContent = '🎯';
    activateItem.classList.add('activating');
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab?.id) {
      showStatus('No active tab found', 'error');
      resetActivateButton(activateIcon);
      return;
    }

    if (!tab.url) {
      showStatus('Cannot access this page', 'error');
      resetActivateButton(activateIcon);
      return;
    }

    // Check if it's a restricted page
    if (tab.url.startsWith('chrome://') || 
        tab.url.startsWith('chrome-extension://') ||
        tab.url.startsWith('https://chrome.google.com/webstore') ||
        tab.url === 'chrome://newtab/') {
      showStatus('Wingman cannot run on Chrome system pages. Please navigate to a regular website.', 'error');
      resetActivateButton(activateIcon);
      return;
    }

    try {
      console.log('[Wingman Popup] Sending message to tab:', tab.id, tab.url);
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'ACTIVATE_OVERLAY' });
      console.log('[Wingman Popup] Response:', response);
      
      if (response?.success) {
        // Morph to success state
        activateIcon.textContent = '✅';
        activateItem.classList.remove('activating');
        activateItem.classList.add('success');
        showStatus('Overlay activated! Switch to your tab.', 'success');
        setTimeout(() => window.close(), 1500);
      } else if (response?.reason === 'already_active') {
        showStatus('Overlay is already active', 'error');
        resetActivateButton(activateIcon);
      } else {
        showStatus('Failed to activate overlay', 'error');
        resetActivateButton(activateIcon);
      }
    } catch (error) {
      console.error('[Wingman Popup] Error:', error);
      showStatus('Failed to activate. Make sure you\'re on a regular webpage.', 'error');
      resetActivateButton(activateIcon);
    }
  });

  helpItem.addEventListener('click', () => {
    showStatus('Activate: Alt+Shift+F | Cancel overlay: Esc', 'success');
  });

  // Handle preview URL toggle
  showPreviewUrlCheckbox.addEventListener('change', async () => {
    try {
      await chrome.storage.local.set({ showPreviewUrl: showPreviewUrlCheckbox.checked });
      console.log('[Wingman Popup] Preview URL setting saved:', showPreviewUrlCheckbox.checked);
    } catch (error) {
      console.error('Failed to save preview URL setting:', error);
      showStatus('Failed to save setting', 'error');
    }
  });

  // Auto-save URL input with debouncing
  relayUrlInput.addEventListener('input', () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    saveTimeout = setTimeout(async () => {
      const relayUrl = relayUrlInput.value.trim() || 'http://localhost:8787';
      try {
        await chrome.storage.local.set({ relayUrl });
        checkConnectionStatus(); // Re-check connection with new URL
      } catch (error) {
        console.error('Failed to save relay URL:', error);
      }
    }, 500); // 500ms debounce
  });

  // Also save on blur for immediate feedback
  relayUrlInput.addEventListener('blur', async () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    const relayUrl = relayUrlInput.value.trim() || 'http://localhost:8787';
    try {
      await chrome.storage.local.set({ relayUrl });
      checkConnectionStatus(); // Re-check connection with new URL
    } catch (error) {
      console.error('Failed to save relay URL:', error);
    }
  });

  // Preset button handlers
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const url = (btn as HTMLButtonElement).dataset.url;
      if (url) {
        relayUrlInput.value = url;
        // Auto-save preset selections immediately
        try {
          await chrome.storage.local.set({ relayUrl: url });
          checkConnectionStatus();
        } catch (error) {
          console.error('Failed to save preset URL:', error);
        }
      }
    });
  });

  function resetActivateButton(icon: HTMLDivElement) {
    icon.textContent = '⚡';
    activateItem.classList.remove('activating', 'success');
  }

  async function checkConnectionStatus() {
    const relayUrl = relayUrlInput.value.trim() || 'http://localhost:8787';
    
    connectionDot.className = 'status-dot connecting';
    connectionText.textContent = 'Checking connection...';
    
    try {
      const response = await fetch(`${relayUrl}/health`, { 
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      
      if (response.ok) {
        connectionDot.className = 'status-dot connected';
        connectionText.textContent = 'Connected to relay server';
      } else {
        connectionDot.className = 'status-dot';
        connectionText.textContent = 'Server unavailable';
      }
    } catch (error) {
      connectionDot.className = 'status-dot';
      connectionText.textContent = 'Cannot reach server';
    }
  }

  function showStatus(message: string, type: 'success' | 'error') {
    statusDiv.textContent = message;
    statusDiv.className = `status-message visible ${type}`;
    
    setTimeout(() => {
      statusDiv.classList.remove('visible');
    }, 3000);
  }

  // Auto-check connection every 10 seconds since settings are always visible
  setInterval(() => {
    checkConnectionStatus();
  }, 10000);
});
import { getEnvironmentConfig } from '../utils/config';

document.addEventListener('DOMContentLoaded', async () => {
  const relayUrlInput = document.getElementById('relayUrl') as HTMLInputElement;
  const activateItem = document.getElementById('activateItem') as HTMLDivElement;
  const helpItem = document.getElementById('helpItem') as HTMLDivElement;
  const statusDiv = document.getElementById('status') as HTMLDivElement;
  const connectionDot = document.getElementById('connectionDot') as HTMLDivElement;
  const connectionText = document.getElementById('connectionText') as HTMLSpanElement;
  const showPreviewUrlCheckbox = document.getElementById('showPreviewUrl') as HTMLInputElement;
  const copyFormatDropdown = document.getElementById('copyFormatDropdown') as HTMLDivElement;
  const copyFormatSelected = document.getElementById('copyFormatSelected') as HTMLDivElement;
  const copyFormatOptions = document.getElementById('copyFormatOptions') as HTMLDivElement;
  const header = document.querySelector('.header') as HTMLDivElement;
  const shortcutText = document.getElementById('shortcutText') as HTMLDivElement;

  let saveTimeout: number | null = null;

  // Set the correct keyboard shortcut text based on platform
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  if (shortcutText) {
    shortcutText.textContent = isMac ? '⌘+Shift+K' : 'Alt+Shift+K';
  }

  // Initialize environment UI
  initializeEnvironmentUI();

  // Load saved settings
  const { relayUrl = 'http://localhost:8787', showPreviewUrl = true, copyFormat = 'claude' } = await chrome.storage.local.get(['relayUrl', 'showPreviewUrl', 'copyFormat']);
  relayUrlInput.value = relayUrl;
  showPreviewUrlCheckbox.checked = showPreviewUrl;
  
  // Initialize custom dropdown
  initializeCustomDropdown(copyFormat);

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
    const shortcut = isMac ? '⌘+Shift+K' : 'Alt+Shift+K';
    showStatus(`Activate: ${shortcut} | Cancel overlay: Esc`, 'success');
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

  // Handle custom dropdown
  function initializeCustomDropdown(selectedFormat: string) {
    const formatData = {
      claude: { icon: '🤖', text: 'Claude Code', desc: 'Optimized for AI conversations' },
      json: { icon: '📄', text: 'JSON', desc: 'Raw structured data' },
      markdown: { icon: '📝', text: 'Markdown', desc: 'Human-readable format' }
    };

    // Set initial selection
    updateSelectedFormat(selectedFormat, formatData);

    // Toggle dropdown
    copyFormatSelected.addEventListener('click', () => {
      const isActive = copyFormatSelected.classList.contains('active');
      copyFormatSelected.classList.toggle('active');
      copyFormatOptions.classList.toggle('visible');
      
      if (!isActive) {
        // Focus first option
        const firstOption = copyFormatOptions.querySelector('.dropdown-option');
        if (firstOption) {
          (firstOption as HTMLElement).focus();
        }
      }
    });

    // Handle option selection
    copyFormatOptions.addEventListener('click', async (e) => {
      const option = (e.target as HTMLElement).closest('.dropdown-option') as HTMLElement;
      if (!option) return;

      const value = option.dataset.value;
      if (value) {
        updateSelectedFormat(value, formatData);
        
        // Close dropdown
        copyFormatSelected.classList.remove('active');
        copyFormatOptions.classList.remove('visible');

        // Save setting
        try {
          await chrome.storage.local.set({ copyFormat: value });
          console.log('[Wingman Popup] Copy format setting saved:', value);
        } catch (error) {
          console.error('Failed to save copy format setting:', error);
          showStatus('Failed to save setting', 'error');
        }
      }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!copyFormatDropdown.contains(e.target as Node)) {
        copyFormatSelected.classList.remove('active');
        copyFormatOptions.classList.remove('visible');
      }
    });
  }

  function updateSelectedFormat(format: string, formatData: any) {
    const data = formatData[format];
    if (data) {
      const iconEl = copyFormatSelected.querySelector('.format-icon') as HTMLElement;
      const textEl = copyFormatSelected.querySelector('.format-text') as HTMLElement;
      
      iconEl.textContent = data.icon;
      textEl.textContent = data.text;

      // Update selected state in options
      copyFormatOptions.querySelectorAll('.dropdown-option').forEach(option => {
        option.classList.toggle('selected', (option as HTMLElement).dataset.value === format);
      });
    }
  }

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

  // Preset button handlers - add slight delay to ensure DOM is ready
  setTimeout(() => {
    document.querySelectorAll('.preset-btn').forEach(btn => {
      console.log('[Wingman Popup] Attaching click handler to preset button:', btn);
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const url = (btn as HTMLButtonElement).dataset.url;
        console.log('[Wingman Popup] Preset button clicked, URL:', url);
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
  }, 100);

  function resetActivateButton(icon: HTMLDivElement) {
    icon.textContent = '⚡';
    activateItem.classList.remove('activating', 'success');
  }

  async function checkConnectionStatus() {
    const relayUrl = relayUrlInput.value.trim() || 'http://localhost:8787';
    console.log('[Wingman Popup] Checking connection to:', relayUrl);
    
    // Handle clipboard mode
    if (relayUrl === 'clipboard') {
      try {
        // Check clipboard permissions
        const permission = await navigator.permissions.query({ name: 'clipboard-write' as PermissionName });
        connectionDot.className = 'status-dot connected';
        connectionText.textContent = 'Copy mode - clipboard ready';
        return;
      } catch (error) {
        connectionDot.className = 'status-dot connected';
        connectionText.textContent = 'Copy mode - no server needed';
        return;
      }
    }
    
    connectionDot.className = 'status-dot connecting';
    connectionText.textContent = 'Checking connection...';
    
    // Use a shorter timeout and handle Chrome extension fetch limitations
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    
    try {
      const response = await fetch(`${relayUrl}/health`, { 
        method: 'GET',
        mode: 'cors',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        connectionDot.className = 'status-dot connected';
        if (relayUrl.includes('localhost')) {
          const port = relayUrl.match(/:(\d+)/)?.[1] || '8787';
          connectionText.textContent = `Connected to local server :${port}`;
        } else {
          connectionText.textContent = 'Connected to remote server';
        }
      } else {
        connectionDot.className = 'status-dot';
        connectionText.textContent = 'Server unavailable';
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.log('[Wingman Popup] Connection check failed:', error);
      
      // For localhost, assume it's running if we get a CORS error (common in Chrome extensions)
      if (relayUrl.includes('localhost')) {
        // Optimistically assume local server is running
        connectionDot.className = 'status-dot connected';
        const port = relayUrl.match(/:(\d+)/)?.[1] || '8787';
        connectionText.textContent = `Local server :${port} (assumed)`;
      } else {
        connectionDot.className = 'status-dot';
        connectionText.textContent = 'Cannot verify server';
      }
    }
  }

  function showStatus(message: string, type: 'success' | 'error') {
    statusDiv.textContent = message;
    statusDiv.className = `status-message visible ${type}`;
    
    setTimeout(() => {
      statusDiv.classList.remove('visible');
    }, 3000);
  }

  // Environment UI initialization
  function initializeEnvironmentUI() {
    try {
      const config = getEnvironmentConfig();
      
      // Skip environment banner for cleaner UI
      // if (config.ui.showEnvironmentBanner && config.ui.environmentLabel) {
      //   const banner = document.createElement('div');
      //   banner.className = 'environment-banner';
      //   banner.textContent = config.ui.environmentLabel;
      //   banner.style.cssText = `
      //     background-color: ${config.ui.headerColor};
      //     color: white;
      //     padding: 4px 12px;
      //     text-align: center;
      //     font-size: 11px;
      //     font-weight: bold;
      //     letter-spacing: 0.5px;
      //     margin-bottom: 8px;
      //     border-radius: 3px;
      //   `;
      //   
      //   // Insert banner at the top of the popup
      //   document.body.insertBefore(banner, document.body.firstChild);
      // }
      
      // Skip header color for cleaner UI
      // if (header) {
      //   header.style.backgroundColor = config.ui.headerColor;
      // }
      
    } catch (error) {
      console.warn('[Wingman Popup] Failed to initialize environment UI:', error);
    }
  }

  // Auto-check connection every 10 seconds since settings are always visible
  setInterval(() => {
    checkConnectionStatus();
  }, 10000);
});
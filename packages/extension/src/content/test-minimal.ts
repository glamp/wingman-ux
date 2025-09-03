// Minimal content script test - no React, no complex imports
console.log('[Wingman Test] Minimal content script loading...');

// Test basic Chrome extension APIs
if (typeof chrome !== 'undefined' && chrome.runtime) {
  console.log('[Wingman Test] Chrome APIs available');
  
  // Test message handling
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[Wingman Test] Message received:', request);
    
    if (request.type === 'ACTIVATE_OVERLAY') {
      console.log('[Wingman Test] ACTIVATE_OVERLAY received - responding with success');
      sendResponse({ success: true });
      return true;
    }
    
    return false;
  });
  
  console.log('[Wingman Test] Message listener registered successfully');
} else {
  console.error('[Wingman Test] Chrome APIs not available');
}

console.log('[Wingman Test] Minimal content script loaded successfully');
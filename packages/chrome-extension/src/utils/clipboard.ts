/**
 * Reliable clipboard utility that works in all browser contexts
 * Uses textarea fallback since navigator.clipboard isn't available in all contexts
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // Create a textarea element
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // Make it invisible and prevent layout shift
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    textArea.style.opacity = '0';
    
    // Add to DOM
    document.body.appendChild(textArea);
    
    // Select and copy
    textArea.focus();
    textArea.select();
    
    let success = false;
    try {
      success = document.execCommand('copy');
      if (!success) {
        console.error('[Wingman] Copy command returned false');
      }
    } catch (err) {
      console.error('[Wingman] Failed to copy to clipboard:', err);
    }
    
    // Clean up
    document.body.removeChild(textArea);
    
    return success;
  } catch (error) {
    console.error('[Wingman] Clipboard copy failed:', error);
    return false;
  }
}
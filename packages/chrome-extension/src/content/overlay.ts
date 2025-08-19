export interface OverlayOptions {
  onSubmit: (note: string, target: any) => void;
  onCancel: () => void;
}

export function createOverlay(options: OverlayOptions) {
  const overlay = document.createElement('div');
  overlay.id = 'wingman-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 2147483647;
    pointer-events: none;
  `;

  const highlighter = document.createElement('div');
  highlighter.id = 'wingman-highlighter';
  highlighter.style.cssText = `
    position: fixed;
    border: 2px solid #0084ff;
    background: rgba(0, 132, 255, 0.1);
    pointer-events: none;
    transition: all 0.1s ease;
  `;

  const notePanel = document.createElement('div');
  notePanel.id = 'wingman-note-panel';
  notePanel.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    pointer-events: all;
    display: none;
    z-index: 2147483648;
    width: 320px;
  `;

  const textarea = document.createElement('textarea');
  textarea.placeholder = 'Describe the issue...';
  textarea.style.cssText = `
    width: 100%;
    height: 80px;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    padding: 8px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    resize: vertical;
    margin-bottom: 12px;
  `;

  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = `
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  `;

  const cancelButton = document.createElement('button');
  cancelButton.textContent = 'Cancel';
  cancelButton.style.cssText = `
    padding: 6px 16px;
    border: 1px solid #e0e0e0;
    background: white;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
  `;

  const submitButton = document.createElement('button');
  submitButton.textContent = 'Send';
  submitButton.style.cssText = `
    padding: 6px 16px;
    border: none;
    background: #0084ff;
    color: white;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
  `;

  buttonContainer.appendChild(cancelButton);
  buttonContainer.appendChild(submitButton);
  notePanel.appendChild(textarea);
  notePanel.appendChild(buttonContainer);

  overlay.appendChild(highlighter);
  overlay.appendChild(notePanel);
  document.body.appendChild(overlay);

  let selectedElement: HTMLElement | null = null;
  let selectedRect: DOMRect | null = null;
  let mode: 'element' | 'region' = 'element';

  // Element selection mode
  overlay.style.pointerEvents = 'all';
  
  const handleMouseMove = (e: MouseEvent) => {
    if (mode === 'element') {
      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      const element = elements.find(el => 
        el !== overlay && 
        el !== highlighter && 
        el !== notePanel &&
        !overlay.contains(el) &&
        !notePanel.contains(el)
      );
      
      if (element) {
        const rect = element.getBoundingClientRect();
        highlighter.style.left = `${rect.left}px`;
        highlighter.style.top = `${rect.top}px`;
        highlighter.style.width = `${rect.width}px`;
        highlighter.style.height = `${rect.height}px`;
        highlighter.style.display = 'block';
      } else {
        highlighter.style.display = 'none';
      }
    }
  };

  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const elements = document.elementsFromPoint(e.clientX, e.clientY);
    const element = elements.find(el => 
      el !== overlay && 
      el !== highlighter && 
      el !== notePanel &&
      !overlay.contains(el) &&
      !notePanel.contains(el)
    );
    
    if (element) {
      selectedElement = element as HTMLElement;
      selectedRect = element.getBoundingClientRect();
      
      // Show note panel
      notePanel.style.display = 'block';
      textarea.focus();
      
      // Stop highlighting
      overlay.removeEventListener('mousemove', handleMouseMove);
      overlay.style.pointerEvents = 'none';
      notePanel.style.pointerEvents = 'all';
    }
  };

  overlay.addEventListener('mousemove', handleMouseMove);
  overlay.addEventListener('click', handleClick);

  cancelButton.addEventListener('click', () => {
    cleanup();
    options.onCancel();
  });

  submitButton.addEventListener('click', () => {
    const note = textarea.value.trim();
    if (!note) {
      textarea.focus();
      return;
    }

    const target = {
      mode: mode as 'element' | 'region',
      rect: selectedRect ? {
        x: selectedRect.left,
        y: selectedRect.top,
        width: selectedRect.width,
        height: selectedRect.height,
      } : null,
      selector: selectedElement ? generateSelector(selectedElement) : undefined,
    };

    cleanup();
    options.onSubmit(note, target);
  });

  // ESC key to cancel
  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      cleanup();
      options.onCancel();
    }
  };
  document.addEventListener('keydown', handleKeydown);

  function cleanup() {
    overlay.remove();
    document.removeEventListener('keydown', handleKeydown);
  }

  return { cleanup };
}

function generateSelector(element: HTMLElement): string {
  const path: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();
    
    if (current.id) {
      selector = `#${current.id}`;
      path.unshift(selector);
      break;
    }
    
    if (current.className) {
      const classes = Array.from(current.classList)
        .filter(c => !c.startsWith('wingman-'))
        .join('.');
      if (classes) {
        selector += `.${classes}`;
      }
    }
    
    const siblings = Array.from(current.parentNode?.children || []);
    if (siblings.length > 1) {
      const index = siblings.indexOf(current) + 1;
      selector += `:nth-child(${index})`;
    }
    
    path.unshift(selector);
    current = current.parentElement;
  }

  return path.join(' > ');
}
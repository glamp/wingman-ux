export interface OverlayOptions {
  onSubmit: (note: string, target: any, element?: HTMLElement) => void;
  onCancel: () => void;
}

export interface SuccessNotificationOptions {
  previewUrl: string;
  onClose: () => void;
}

// HTML to Markdown converter function
function htmlToMarkdown(html: string): string {
  // Create a temporary div to parse the HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  // Process the nodes recursively
  function processNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }
    
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }
    
    const element = node as HTMLElement;
    const tagName = element.tagName.toLowerCase();
    let content = Array.from(element.childNodes).map(processNode).join('');
    
    switch (tagName) {
      case 'strong':
      case 'b':
        return `**${content}**`;
      case 'em':
      case 'i':
        return `*${content}*`;
      case 'code':
        // Check if it's inside a pre tag (code block)
        if (element.parentElement?.tagName.toLowerCase() === 'pre') {
          return content;
        }
        return `\`${content}\``;
      case 'pre':
        return `\n\`\`\`\n${content}\n\`\`\`\n`;
      case 'a':
        const href = element.getAttribute('href') || '';
        return `[${content}](${href})`;
      case 'ul':
        return '\n' + Array.from(element.children).map(li => {
          const liContent = Array.from(li.childNodes).map(processNode).join('');
          return `- ${liContent}`;
        }).join('\n') + '\n';
      case 'ol':
        return '\n' + Array.from(element.children).map((li, index) => {
          const liContent = Array.from(li.childNodes).map(processNode).join('');
          return `${index + 1}. ${liContent}`;
        }).join('\n') + '\n';
      case 'p':
        return content + '\n\n';
      case 'br':
        return '\n';
      case 'div':
        // Handle divs as paragraphs if they contain text
        if (content.trim()) {
          return content + '\n';
        }
        return content;
      default:
        return content;
    }
  }
  
  const markdown = Array.from(temp.childNodes).map(processNode).join('');
  // Clean up excessive newlines
  return markdown.trim().replace(/\n{3,}/g, '\n\n');
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
    width: 360px;
  `;

  // Create formatting toolbar
  const toolbar = document.createElement('div');
  toolbar.style.cssText = `
    display: flex;
    gap: 4px;
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid #e0e0e0;
    flex-wrap: wrap;
  `;

  // Toolbar button styles
  const toolbarButtonStyle = `
    padding: 4px 8px;
    border: 1px solid #e0e0e0;
    background: white;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;

  // Create toolbar buttons
  const formatButtons = [
    { text: 'B', command: 'bold', title: 'Bold (Cmd/Ctrl+B)' },
    { text: 'I', command: 'italic', title: 'Italic (Cmd/Ctrl+I)' },
    { text: '</>', command: 'code', title: 'Code (Cmd/Ctrl+`)' },
    { text: '•', command: 'insertUnorderedList', title: 'Bullet List' },
    { text: '1.', command: 'insertOrderedList', title: 'Numbered List' },
    { text: '🔗', command: 'link', title: 'Insert Link (Cmd/Ctrl+K)' },
    { text: '{ }', command: 'codeblock', title: 'Code Block' },
  ];

  formatButtons.forEach(btn => {
    const button = document.createElement('button');
    button.textContent = btn.text;
    button.title = btn.title;
    button.style.cssText = toolbarButtonStyle;
    
    // Special styling for bold and italic buttons
    if (btn.command === 'bold') {
      button.style.fontWeight = 'bold';
    } else if (btn.command === 'italic') {
      button.style.fontStyle = 'italic';
    }
    
    button.onmouseover = () => {
      button.style.background = '#f0f0f0';
      button.style.borderColor = '#0084ff';
    };
    
    button.onmouseout = () => {
      button.style.background = 'white';
      button.style.borderColor = '#e0e0e0';
    };
    
    button.onmousedown = (e) => {
      e.preventDefault(); // Prevent focus loss from editor
      handleFormatCommand(btn.command);
    };
    
    toolbar.appendChild(button);
  });

  // Create rich text editor (contenteditable div)
  const editor = document.createElement('div');
  editor.contentEditable = 'true';
  editor.setAttribute('data-placeholder', 'Describe the issue...');
  editor.style.cssText = `
    width: 100%;
    min-height: 100px;
    max-height: 300px;
    overflow-y: auto;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    padding: 8px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    margin-bottom: 12px;
    outline: none;
    line-height: 1.5;
  `;

  // Add placeholder styles
  const placeholderStyle = document.createElement('style');
  placeholderStyle.textContent = `
    #wingman-note-panel div[contenteditable]:empty:before {
      content: attr(data-placeholder);
      color: #999;
      pointer-events: none;
      display: block;
    }
    #wingman-note-panel div[contenteditable] code {
      background: #f4f4f4;
      padding: 2px 4px;
      border-radius: 3px;
      font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
      font-size: 0.9em;
    }
    #wingman-note-panel div[contenteditable] pre {
      background: #f4f4f4;
      padding: 8px;
      border-radius: 4px;
      margin: 8px 0;
      overflow-x: auto;
    }
    #wingman-note-panel div[contenteditable] pre code {
      background: none;
      padding: 0;
    }
    #wingman-note-panel div[contenteditable] a {
      color: #0084ff;
      text-decoration: underline;
    }
    #wingman-note-panel div[contenteditable]:focus {
      border-color: #0084ff;
      box-shadow: 0 0 0 2px rgba(0, 132, 255, 0.1);
    }
  `;
  document.head.appendChild(placeholderStyle);

  // Format command handler
  function handleFormatCommand(command: string) {
    editor.focus();
    
    if (command === 'link') {
      const url = prompt('Enter URL:');
      if (url) {
        const selection = window.getSelection();
        if (selection && selection.toString()) {
          document.execCommand('createLink', false, url);
        } else {
          // Insert link with URL as text if no selection
          document.execCommand('insertHTML', false, `<a href="${url}">${url}</a>`);
        }
      }
    } else if (command === 'code') {
      const selection = window.getSelection();
      if (selection && selection.toString()) {
        document.execCommand('insertHTML', false, `<code>${selection.toString()}</code>`);
      }
    } else if (command === 'codeblock') {
      const selection = window.getSelection();
      const text = selection ? selection.toString() : '';
      document.execCommand('insertHTML', false, `<pre><code>${text || '// Code here'}</code></pre><p></p>`);
    } else {
      document.execCommand(command, false);
    }
  }

  // Add keyboard shortcuts
  editor.addEventListener('keydown', (e) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modKey = isMac ? e.metaKey : e.ctrlKey;
    
    if (modKey) {
      switch(e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          handleFormatCommand('bold');
          break;
        case 'i':
          e.preventDefault();
          handleFormatCommand('italic');
          break;
        case '`':
          e.preventDefault();
          handleFormatCommand('code');
          break;
        case 'k':
          e.preventDefault();
          handleFormatCommand('link');
          break;
      }
    }
  });

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
  notePanel.appendChild(toolbar);
  notePanel.appendChild(editor);
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
      editor.focus();
      
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
    const htmlContent = editor.innerHTML.trim();
    if (!htmlContent || htmlContent === '<br>') {
      editor.focus();
      return;
    }
    
    // Convert HTML to Markdown
    const note = htmlToMarkdown(htmlContent);

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
    options.onSubmit(note, target, selectedElement || undefined);
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

export function createSuccessNotification(options: SuccessNotificationOptions) {
  const notification = document.createElement('div');
  notification.id = 'wingman-success-notification';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.15);
    z-index: 2147483649;
    width: 520px;
    animation: slideIn 0.3s ease-out;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;

  // Add animation styles
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);

  // Success header
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
  `;

  const successIcon = document.createElement('div');
  successIcon.textContent = '✅';
  successIcon.style.cssText = `
    font-size: 24px;
  `;

  const title = document.createElement('div');
  title.textContent = 'Feedback submitted successfully!';
  title.style.cssText = `
    font-size: 16px;
    font-weight: 600;
    color: #1e293b;
  `;

  const closeButton = document.createElement('button');
  closeButton.textContent = '✕';
  closeButton.style.cssText = `
    position: absolute;
    top: 12px;
    right: 12px;
    background: none;
    border: none;
    font-size: 20px;
    color: #94a3b8;
    cursor: pointer;
    padding: 4px;
    line-height: 1;
  `;
  closeButton.onclick = () => close();

  header.appendChild(successIcon);
  header.appendChild(title);

  // Preview URL section
  const urlSection = document.createElement('div');
  urlSection.style.cssText = `
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 12px;
  `;

  const urlLabel = document.createElement('div');
  urlLabel.textContent = 'Preview URL:';
  urlLabel.style.cssText = `
    font-size: 12px;
    color: #64748b;
    margin-bottom: 6px;
    font-weight: 500;
  `;

  const urlContainer = document.createElement('div');
  urlContainer.style.cssText = `
    display: flex;
    gap: 8px;
    align-items: center;
  `;

  const urlInput = document.createElement('input');
  urlInput.value = options.previewUrl;
  urlInput.readOnly = true;
  urlInput.style.cssText = `
    flex: 1;
    padding: 8px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 12px;
    font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
    background: white;
    color: #1e293b;
  `;

  const copyButton = document.createElement('button');
  copyButton.textContent = '📋';
  copyButton.title = 'Copy URL';
  copyButton.style.cssText = `
    padding: 6px 10px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    cursor: pointer;
    font-size: 16px;
    transition: all 0.2s;
  `;
  copyButton.onmouseover = () => {
    copyButton.style.background = '#f0f0f0';
    copyButton.style.borderColor = '#0084ff';
  };
  copyButton.onmouseout = () => {
    copyButton.style.background = 'white';
    copyButton.style.borderColor = '#e2e8f0';
  };
  copyButton.onclick = async () => {
    try {
      await navigator.clipboard.writeText(options.previewUrl);
      copyButton.textContent = '✓';
      setTimeout(() => {
        copyButton.textContent = '📋';
      }, 2000);
    } catch (err) {
      // Fallback for older browsers
      urlInput.select();
      document.execCommand('copy');
      copyButton.textContent = '✓';
      setTimeout(() => {
        copyButton.textContent = '📋';
      }, 2000);
    }
  };

  urlContainer.appendChild(urlInput);
  urlContainer.appendChild(copyButton);
  urlSection.appendChild(urlLabel);
  urlSection.appendChild(urlContainer);

  // Action buttons
  const actions = document.createElement('div');
  actions.style.cssText = `
    display: flex;
    gap: 12px;
    justify-content: space-between;
  `;

  const openButton = document.createElement('button');
  openButton.textContent = 'Open Preview';
  openButton.style.cssText = `
    padding: 10px 20px;
    background: #0084ff;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  `;
  openButton.onmouseover = () => {
    openButton.style.background = '#0073e6';
  };
  openButton.onmouseout = () => {
    openButton.style.background = '#0084ff';
  };
  openButton.onclick = () => {
    window.open(options.previewUrl, '_blank');
  };

  const claudeButton = document.createElement('button');
  claudeButton.textContent = 'Copy for Claude Code';
  claudeButton.style.cssText = `
    padding: 10px 20px;
    background: white;
    color: #1e293b;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
    margin-left: auto;
  `;
  claudeButton.onmouseover = () => {
    claudeButton.style.background = '#f8fafc';
    claudeButton.style.borderColor = '#0084ff';
  };
  claudeButton.onmouseout = () => {
    claudeButton.style.background = 'white';
    claudeButton.style.borderColor = '#e2e8f0';
  };
  claudeButton.onclick = async () => {
    try {
      await navigator.clipboard.writeText(options.previewUrl);
      claudeButton.textContent = '✓ Copied!';
      setTimeout(() => {
        claudeButton.textContent = 'Copy for Claude Code';
      }, 2000);
    } catch (err) {
      // Fallback
      urlInput.select();
      document.execCommand('copy');
      claudeButton.textContent = '✓ Copied!';
      setTimeout(() => {
        claudeButton.textContent = 'Copy for Claude Code';
      }, 2000);
    }
  };

  actions.appendChild(openButton);
  actions.appendChild(claudeButton);

  // Assemble notification
  notification.appendChild(closeButton);
  notification.appendChild(header);
  notification.appendChild(urlSection);
  notification.appendChild(actions);

  document.body.appendChild(notification);

  // Auto-dismiss after 10 seconds
  let dismissTimeout = setTimeout(() => {
    close();
  }, 4000);

  function close() {
    clearTimeout(dismissTimeout);
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
      notification.remove();
      style.remove();
      options.onClose();
    }, 300);
  }

  // Prevent auto-dismiss on hover
  notification.onmouseenter = () => {
    clearTimeout(dismissTimeout);
  };
  notification.onmouseleave = () => {
    dismissTimeout = setTimeout(() => {
      close();
    }, 4000);
  };

  return { close };
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
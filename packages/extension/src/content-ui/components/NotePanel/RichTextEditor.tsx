import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import Editor, {
  BtnBold,
  BtnBulletList,
  BtnItalic,
  BtnNumberedList,
  createButton,
  Toolbar,
} from 'react-simple-wysiwyg';

// Custom inline code button for technical feedback
const BtnCode = createButton('Code', '</>', () => {
  const selection = window.getSelection();
  if (selection && selection.toString()) {
    document.execCommand('insertHTML', false, `<code>${selection.toString()}</code>`);
  }
});

// Enhanced WYSIWYG CSS - 25% larger and cleaner
const WYSIWYG_CSS = `
/* Global font override for all WYSIWYG elements */
.rsw-editor,
.rsw-editor *,
.rsw-ce,
.rsw-ce *,
.rsw-ce[contenteditable="true"],
.rsw-ce[contenteditable="true"] * {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
}

.rsw-editor {
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  min-height: 190px;
  overflow: hidden;
}

.rsw-ce {
  flex: 1 1 auto;
  overflow: auto;
  padding: 12px;
  font-size: 14px;
  line-height: 1.5;
}

/* Override any default contenteditable styles */
[contenteditable="true"],
[contenteditable="true"] * {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
}

.rsw-ce:focus {
  outline: 2px solid #0084ff;
  outline-offset: -2px;
}

.rsw-ce[contentEditable=true]:empty:not(:focus):before {
  color: #94a3b8;
  content: attr(placeholder);
  pointer-events: none;
}

.rsw-btn {
  background: transparent;
  border: 0;
  color: #1e293b;
  cursor: pointer;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
  font-size: 14px;
  font-weight: 500;
  height: 30px;
  outline: none;
  padding: 0 4px;
  min-width: 28px;
  border-radius: 3px;
  margin: 0 1px;
}

.rsw-btn:hover {
  background: #f8fafc;
}

.rsw-btn[data-active=true] {
  background: linear-gradient(135deg, rgba(0, 132, 255, 0.1), rgba(139, 92, 246, 0.1));
  color: #0084ff;
}

.rsw-toolbar {
  align-items: center;
  background-color: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  padding: 6px 8px;
  gap: 2px;
}

/* Style lists properly */
.rsw-ce ul {
  margin: 8px 0;
  padding-left: 24px;
}

.rsw-ce li {
  margin: 4px 0;
}

.rsw-ce ol {
  margin: 8px 0;
  padding-left: 24px;
}

/* Style inline code elements */
.rsw-ce code {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 3px;
  padding: 2px 4px;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  font-size: 13px;
  color: #ef4444;
}
`;

export interface RichTextEditorHandle {
  getHTML: () => string;
  focus: () => void;
}

interface RichTextEditorProps {
  placeholder?: string;
  onKeyDown?: (event: React.KeyboardEvent) => void;
  initialValue?: string;
}

const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(
  ({ placeholder = 'Describe the issue...', onKeyDown, initialValue = '' }, ref) => {
    const [html, setHtml] = React.useState(initialValue);
    const editorRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      getHTML: () => {
        return html;
      },
      focus: () => {
        // Focus the editor's contenteditable element
        const editable = editorRef.current?.querySelector('.rsw-ce');
        if (editable instanceof HTMLElement) {
          editable.focus();
        }
      },
    }));

    // Inject CSS into shadow DOM - do it immediately and on mount
    useEffect(() => {
      const injectStyles = () => {
        const shadowHost = document.getElementById('wingman-overlay-host');
        if (shadowHost && shadowHost.shadowRoot) {
          // Remove old styles if they exist
          const oldStyle = shadowHost.shadowRoot.querySelector('#wysiwyg-styles');
          if (oldStyle) {
            oldStyle.remove();
          }
          
          // Inject fresh styles
          const style = document.createElement('style');
          style.id = 'wysiwyg-styles';
          style.textContent = WYSIWYG_CSS;
          // Insert at the beginning to ensure it loads before other styles
          shadowHost.shadowRoot.insertBefore(style, shadowHost.shadowRoot.firstChild);
          
          // Force a re-render of contenteditable with !important
          setTimeout(() => {
            const editable = shadowHost.shadowRoot.querySelector('.rsw-ce');
            if (editable instanceof HTMLElement) {
              editable.style.setProperty('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', 'important');
            }
          }, 0);
        } else {
          console.warn('[Wingman] Could not find shadow host to inject WYSIWYG styles');
        }
      };
      
      injectStyles();
      // Also inject after a small delay to ensure DOM is ready
      setTimeout(injectStyles, 100);
    }, []);

    function onChange(e: any) {
      setHtml(e.target.value);
    }

    return (
      <div ref={editorRef}>
        <Editor value={html} onChange={onChange} onKeyDown={onKeyDown} placeholder={placeholder}>
          <Toolbar>
            <BtnBold />
            <BtnItalic />
            <BtnBulletList />
            <BtnNumberedList />
            <BtnCode />
          </Toolbar>
        </Editor>
      </div>
    );
  }
);

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;

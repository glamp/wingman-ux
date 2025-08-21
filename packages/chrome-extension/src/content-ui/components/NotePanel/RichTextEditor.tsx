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
.rsw-editor {
  border: 1px solid #ddd;
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

.rsw-ce:focus {
  outline: 2px solid #0084ff;
  outline-offset: -2px;
}

.rsw-ce[contentEditable=true]:empty:not(:focus):before {
  color: #999;
  content: attr(placeholder);
  pointer-events: none;
}

.rsw-btn {
  background: transparent;
  border: 0;
  color: #333;
  cursor: pointer;
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
  background: #f0f0f0;
}

.rsw-btn[data-active=true] {
  background: #e3f2fd;
  color: #1976d2;
}

.rsw-toolbar {
  align-items: center;
  background-color: #fafafa;
  border-bottom: 1px solid #e0e0e0;
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
  background-color: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
  padding: 2px 4px;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  font-size: 13px;
  color: #d73a49;
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

    // Inject CSS into shadow DOM
    useEffect(() => {
      const shadowHost = document.getElementById('wingman-overlay-host');
      if (shadowHost && shadowHost.shadowRoot) {
        // Check if styles are already injected
        if (!shadowHost.shadowRoot.querySelector('#wysiwyg-styles')) {
          const style = document.createElement('style');
          style.id = 'wysiwyg-styles';
          style.textContent = WYSIWYG_CSS;
          shadowHost.shadowRoot.appendChild(style);
          console.log('[Wingman] Injected WYSIWYG styles into shadow DOM');
        }
      } else {
        console.warn('[Wingman] Could not find shadow host to inject WYSIWYG styles');
      }
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

import React, { useRef, useEffect } from 'react';
import {
  Paper,
  Button,
  Stack,
  Box,
} from '@mui/material';
import RichTextEditor, { RichTextEditorHandle } from './RichTextEditor';
import { htmlToMarkdown } from '../../utils/htmlToMarkdown';

export interface NotePanelProps {
  visible: boolean;
  onSubmit: (note: string) => void;
  onCancel: () => void;
}

const NotePanel: React.FC<NotePanelProps> = ({
  visible,
  onSubmit,
  onCancel,
}) => {
  const editorRef = useRef<RichTextEditorHandle>(null);

  // Detect platform for keyboard shortcut display
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const submitShortcut = isMac ? '⌘↩' : 'Ctrl+↩';

  // Autofocus the editor when the panel becomes visible
  useEffect(() => {
    if (visible) {
      // Delay to ensure Shadow DOM and styles are fully loaded
      setTimeout(() => {
        editorRef.current?.focus();
      }, 200);
    }
  }, [visible]);

  const handleSubmit = () => {
    const htmlContent = editorRef.current?.getHTML()?.trim();
    if (!htmlContent || htmlContent === '<br>') {
      editorRef.current?.focus();
      return;
    }
    
    // Convert HTML to Markdown
    const note = htmlToMarkdown(htmlContent);
    onSubmit(note);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // ESC key to cancel
    if (e.key === 'Escape') {
      onCancel();
    }
    // Cmd/Ctrl + Enter to submit
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modKey = isMac ? e.metaKey : e.ctrlKey;
    if (modKey && e.key === 'Enter') {
      handleSubmit();
    }
  };

  if (!visible) return null;

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        width: 360,
        p: 2,
        zIndex: 2147483648,
        pointerEvents: 'all'
      }}
    >
      <RichTextEditor
        ref={editorRef}
        placeholder="Describe the issue..."
        onKeyDown={handleKeyDown}
      />
      
      <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2 }}>
        <Button
          variant="outlined"
          onClick={onCancel}
          size="small"
          sx={{ textTransform: 'none' }}
        >
          Cancel
          <Box component="span" sx={{ ml: 0.5, opacity: 0.6, fontSize: '0.75rem' }}>
            (Esc)
          </Box>
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          size="small"
          sx={{ textTransform: 'none' }}
        >
          Send
          <Box component="span" sx={{ ml: 0.5, opacity: 0.8, fontSize: '0.75rem' }}>
            ({submitShortcut})
          </Box>
        </Button>
      </Stack>
    </Paper>
  );
};

export default NotePanel;
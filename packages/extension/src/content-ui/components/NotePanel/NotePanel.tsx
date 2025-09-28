import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Paper,
  Button,
  Stack,
  Box,
  Chip,
  Typography,
  Tooltip,
  Fade,
  Select,
  MenuItem,
  FormControl,
} from '@mui/material';
import RichTextEditor, { RichTextEditorHandle } from './RichTextEditor';
import { htmlToMarkdown } from '../../utils/htmlToMarkdown';
import { useTemplateStore } from '@/stores/template-store';
// Removed icon imports - using emoji instead for better compatibility

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
  const [showTemplateToast, setShowTemplateToast] = useState(false);
  const [cycledTemplate, setCycledTemplate] = useState<string | null>(null);

  // Try to use template store, with fallback
  let getSelectedTemplate: any, cycleTemplate: any, getAllTemplates: any, setSelectedTemplate: any;
  let selectedTemplate: any = null;
  let allTemplates: any[] = [];

  try {
    const store = useTemplateStore();
    getSelectedTemplate = store.getSelectedTemplate;
    cycleTemplate = store.cycleTemplate;
    getAllTemplates = store.getAllTemplates;
    setSelectedTemplate = store.setSelectedTemplate;
    selectedTemplate = getSelectedTemplate();
    allTemplates = getAllTemplates();
  } catch (error) {
    console.warn('Template store not available in content script:', error);
    // Provide fallback functions with built-in templates
    const fallbackTemplates = [
      { id: 'builtin-minimal', name: 'Minimal', description: 'Quick capture with essentials' },
      { id: 'builtin-standard', name: 'Standard', description: 'Balanced detail' },
      { id: 'builtin-robust', name: 'Robust', description: 'Full diagnostic info' }
    ];
    selectedTemplate = fallbackTemplates[1]; // Default to Standard
    allTemplates = fallbackTemplates;
    getSelectedTemplate = () => selectedTemplate;
    setSelectedTemplate = (id: string) => {
      const template = fallbackTemplates.find(t => t.id === id);
      if (template) selectedTemplate = template;
    };
    cycleTemplate = () => {
      const currentIndex = fallbackTemplates.findIndex(t => t.id === selectedTemplate.id);
      const nextIndex = (currentIndex + 1) % fallbackTemplates.length;
      selectedTemplate = fallbackTemplates[nextIndex];
    };
    getAllTemplates = () => fallbackTemplates;
  }

  // Detect platform for keyboard shortcut display
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const submitShortcut = isMac ? '⌘↩' : 'Ctrl+↩';
  const cycleShortcut = 'Tab';

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

  const handleCycleTemplate = useCallback(() => {
    cycleTemplate();
    const newTemplate = getSelectedTemplate();
    if (newTemplate) {
      setCycledTemplate(newTemplate.name);
      setShowTemplateToast(true);
      setTimeout(() => {
        setShowTemplateToast(false);
        setTimeout(() => setCycledTemplate(null), 150);
      }, 1500);
    }
  }, [cycleTemplate, getSelectedTemplate]);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const newTemplate = allTemplates.find(t => t.id === templateId);
    if (newTemplate) {
      setCycledTemplate(newTemplate.name);
      setShowTemplateToast(true);
      setTimeout(() => {
        setShowTemplateToast(false);
        setTimeout(() => setCycledTemplate(null), 150);
      }, 1500);
    }
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
    // Tab to cycle templates
    if (e.key === 'Tab') {
      e.preventDefault();
      handleCycleTemplate();
    }
  };

  if (!visible) return null;

  return (
    <>
      {/* Template Toast Notification */}
      <Fade in={showTemplateToast} timeout={150}>
        <Paper
          elevation={6}
          sx={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            p: 2,
            zIndex: 2147483649,
            minWidth: 200,
            textAlign: 'center',
            backgroundColor: 'background.paper',
            border: '1px solid',
            borderColor: 'primary.main',
          }}
        >
          <Stack spacing={1} alignItems="center">
            <Typography variant="h6">✓</Typography>
            <Typography variant="subtitle1" fontWeight="medium">
              {cycledTemplate || selectedTemplate?.name || 'Standard'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Template Selected
            </Typography>
          </Stack>
        </Paper>
      </Fade>

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
        {/* Template Selector */}
        <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={selectedTemplate?.id || 'builtin-standard'}
              onChange={(e) => handleTemplateSelect(e.target.value)}
              MenuProps={{
                disablePortal: true,
                anchorOrigin: {
                  vertical: 'bottom',
                  horizontal: 'left',
                },
                transformOrigin: {
                  vertical: 'top',
                  horizontal: 'left',
                },
              }}
              sx={{
                fontSize: '0.875rem',
                height: 32,
                '& .MuiSelect-select': {
                  py: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                }
              }}
            >
              {allTemplates.map((template) => (
                <MenuItem key={template.id} value={template.id} sx={{ fontSize: '0.875rem' }}>
                  {template.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ flex: 1 }} />

          <Tooltip title={`Press ${cycleShortcut} to cycle templates`}>
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.75rem',
                color: 'text.secondary',
                cursor: 'pointer',
                '&:hover': { color: 'text.primary' }
              }}
              onClick={handleCycleTemplate}
            >
              ⌨️ {cycleShortcut}
            </Typography>
          </Tooltip>
        </Box>

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
          Submit
          <Box component="span" sx={{ ml: 0.5, opacity: 0.8, fontSize: '0.75rem' }}>
            ({submitShortcut})
          </Box>
        </Button>
      </Stack>
    </Paper>
    </>
  );
};

export default NotePanel;
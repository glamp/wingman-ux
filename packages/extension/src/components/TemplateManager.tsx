import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
  Collapse,
  Alert,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useTemplateStore } from '@/stores/template-store';
import { builtInTemplates } from '@wingman/shared';
import type { AnnotationTemplate } from '@wingman/shared';

interface TemplateEditorDialogProps {
  open: boolean;
  onClose: () => void;
  template?: AnnotationTemplate;
  onSave: (template: Partial<AnnotationTemplate>) => void;
}

const TemplateEditorDialog: React.FC<TemplateEditorDialogProps> = ({
  open,
  onClose,
  template,
  onSave,
}) => {
  const [name, setName] = useState(template?.name || '');
  const [templateContent, setTemplateContent] = useState(template?.template || '');
  const [showHelp, setShowHelp] = useState(false);

  React.useEffect(() => {
    if (template) {
      setName(template.name);
      setTemplateContent(template.template);
    } else {
      setName('');
      setTemplateContent('');
    }
  }, [template]);

  const handleSave = () => {
    onSave({
      name,
      description: `Custom template: ${name}`,
      template: templateContent,
      tags: [],
      variables: [], // Variables will be auto-detected from template
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {template ? 'Edit Template' : 'Create New Template'}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <TextField
            label="Template Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
            placeholder="e.g., Detailed Bug Report"
          />

          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle2">Template Content</Typography>
              <Button
                size="small"
                startIcon={showHelp ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                onClick={() => setShowHelp(!showHelp)}
              >
                {showHelp ? 'Hide' : 'Show'} Variables
              </Button>
            </Box>

            <Collapse in={showHelp}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                  Available variables:<br/>
                  {'{{userNote}}'}, {'{{pageUrl}}'}, {'{{pageTitle}}'}, {'{{screenshotUrl}}'},
                  {'{{targetSelector}}'}, {'{{viewportWidth}}'}, {'{{viewportHeight}}'},
                  {'{{#if hasErrors}}'}, {'{{#each errors}}'}, {'{{#each consoleLogs}}'},
                  {'{{#each networkRequests}}'}, {'{{reactComponentName}}'}, {'{{annotationId}}'}
                </Typography>
              </Alert>
            </Collapse>

            <TextField
              value={templateContent}
              onChange={(e) => setTemplateContent(e.target.value)}
              fullWidth
              multiline
              rows={10}
              placeholder="Enter your template using Handlebars syntax..."
              sx={{
                '& .MuiInputBase-input': {
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                },
              }}
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!name || !templateContent}
        >
          {template ? 'Save' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const TemplateManager: React.FC = () => {
  const {
    selectedTemplateId,
    customTemplates,
    setSelectedTemplate,
    addCustomTemplate,
    updateCustomTemplate,
    deleteCustomTemplate,
    getAllTemplates,
  } = useTemplateStore();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AnnotationTemplate | undefined>();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCreateNew = () => {
    setEditingTemplate(undefined);
    setEditorOpen(true);
  };

  const handleEdit = (template: AnnotationTemplate) => {
    if (template.builtIn) return;
    setEditingTemplate(template);
    setEditorOpen(true);
  };

  const handleDuplicate = (template: AnnotationTemplate) => {
    addCustomTemplate({
      name: `${template.name} (Copy)`,
      description: template.description,
      template: template.template,
      tags: [...(template.tags || []), 'copy'],
      variables: template.variables,
    });
  };

  const handleCopyTemplate = (template: AnnotationTemplate) => {
    navigator.clipboard.writeText(template.template);
    setCopiedId(template.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSave = (templateData: Partial<AnnotationTemplate>) => {
    if (editingTemplate) {
      updateCustomTemplate(editingTemplate.id, templateData);
    } else {
      addCustomTemplate(templateData as any);
    }
  };

  const allTemplates = getAllTemplates();

  return (
    <Stack spacing={3}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Template Library</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateNew}
          size="small"
        >
          Create Template
        </Button>
      </Box>

      {/* Built-in Templates */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
          Built-in Templates
        </Typography>
        <Grid container spacing={2}>
          {builtInTemplates.map((template) => (
            <Grid item xs={12} key={template.id}>
              <Card
                variant="outlined"
                sx={{
                  border: selectedTemplateId === template.id ? 2 : 1,
                  borderColor: selectedTemplateId === template.id ? 'primary.main' : 'divider',
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="subtitle1" fontWeight="medium">
                          {template.name}
                        </Typography>
                        {selectedTemplateId === template.id && (
                          <Chip
                            icon={<CheckCircleIcon />}
                            label="Active"
                            size="small"
                            color="primary"
                          />
                        )}
                        <Chip label="Built-in" size="small" variant="outlined" />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {template.description}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    onClick={() => setSelectedTemplate(template.id)}
                    disabled={selectedTemplateId === template.id}
                  >
                    Use This
                  </Button>
                  <Button
                    size="small"
                    onClick={() => handleDuplicate(template)}
                  >
                    Duplicate
                  </Button>
                  <IconButton
                    size="small"
                    onClick={() => handleCopyTemplate(template)}
                  >
                    {copiedId === template.id ? <CheckCircleIcon /> : <ContentCopyIcon />}
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Custom Templates */}
      {customTemplates.length > 0 && (
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
            Custom Templates
          </Typography>
          <Grid container spacing={2}>
            {customTemplates.map((template) => (
              <Grid item xs={12} key={template.id}>
                <Card
                  variant="outlined"
                  sx={{
                    border: selectedTemplateId === template.id ? 2 : 1,
                    borderColor: selectedTemplateId === template.id ? 'primary.main' : 'divider',
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography variant="subtitle1" fontWeight="medium">
                            {template.name}
                          </Typography>
                          {selectedTemplateId === template.id && (
                            <Chip
                              icon={<CheckCircleIcon />}
                              label="Active"
                              size="small"
                              color="primary"
                            />
                          )}
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {template.description}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      onClick={() => setSelectedTemplate(template.id)}
                      disabled={selectedTemplateId === template.id}
                    >
                      Use This
                    </Button>
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(template)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleCopyTemplate(template)}
                    >
                      {copiedId === template.id ? <CheckCircleIcon /> : <ContentCopyIcon />}
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => deleteCustomTemplate(template.id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Editor Dialog */}
      <TemplateEditorDialog
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        template={editingTemplate}
        onSave={handleSave}
      />
    </Stack>
  );
};
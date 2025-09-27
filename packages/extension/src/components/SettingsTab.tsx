import { useSettingsStore } from '@/stores/settings-store';
import {
  Box,
  Button,
  Collapse,
  FormControl,
  FormControlLabel,
  FormLabel,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import React from 'react';
import { defaultTemplate } from '@wingman/shared';

// Use the actual template from the shared package
const DEFAULT_TEMPLATE = defaultTemplate.template;

export const SettingsTab: React.FC = () => {
  const { relayUrl, showPreviewUrl, customPromptTemplate, setRelayUrl, setShowPreviewUrl, setCustomPromptTemplate } = useSettingsStore();
  const [showAvailableFields, setShowAvailableFields] = React.useState(false);
  const [templateValue, setTemplateValue] = React.useState(customPromptTemplate || DEFAULT_TEMPLATE);

  const handleRelayChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRelayUrl(event.target.value);
  };

  const handlePreviewToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    setShowPreviewUrl(event.target.checked);
  };

  const handleTemplateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setTemplateValue(value);
    setCustomPromptTemplate(value === DEFAULT_TEMPLATE ? null : value);
  };

  const handleResetTemplate = () => {
    setTemplateValue(DEFAULT_TEMPLATE);
    setCustomPromptTemplate(null);
  };

  React.useEffect(() => {
    setTemplateValue(customPromptTemplate || DEFAULT_TEMPLATE);
  }, [customPromptTemplate]);

  return (
    <Stack spacing={3}>
      {/* Output Mode */}
      <Paper elevation={1} sx={{ p: 3 }}>
        <FormControl component="fieldset" fullWidth>
          <FormLabel component="legend" sx={{ mb: 2 }}>
            <Typography variant="subtitle2">Output Mode</Typography>
          </FormLabel>
          <RadioGroup value={relayUrl} onChange={handleRelayChange}>
            <FormControlLabel
              value="clipboard"
              control={<Radio />}
              label={
                <Box>
                  <Typography variant="body2">Clipboard</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Copy formatted feedback to clipboard
                  </Typography>
                </Box>
              }
            />
            {/* Local and Remote modes temporarily disabled. Not yet implemented.*/}
            {/*
            <FormControlLabel
              value="http://localhost:8787"
              control={<Radio />}
              label={
                <Box>
                  <Typography variant="body2">Local Server</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Send to local Wingman server (port 8787)
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              value="https://api.wingmanux.com"
              control={<Radio />}
              label={
                <Box>
                  <Typography variant="body2">Remote Server</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Send to Wingman cloud service
                  </Typography>
                </Box>
              }
            />
            */}
          </RadioGroup>
        </FormControl>
      </Paper>

      {/* Additional Options */}
      <Paper elevation={1} sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="subtitle2">Display Options</Typography>

          <FormControlLabel
            control={<Switch checked={showPreviewUrl} onChange={handlePreviewToggle} />}
            label={
              <Box>
                <Typography variant="body2">Show Preview URLs</Typography>
                <Typography variant="caption" color="text.secondary">
                  Display preview links for shared content
                </Typography>
              </Box>
            }
          />
        </Stack>
      </Paper>

      {/* Prompt Template */}
      <Paper elevation={1} sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2">Prompt Template</Typography>
            <Button
              size="small"
              onClick={() => setShowAvailableFields(!showAvailableFields)}
            >
              {showAvailableFields ? 'Hide' : 'Show'} Available Fields
            </Button>
          </Box>

          <Collapse in={showAvailableFields}>
            <Paper sx={{ p: 2, bgcolor: 'action.hover' }}>
              <Typography variant="caption" component="div" sx={{ mb: 1, fontWeight: 600 }}>
                Available Template Variables:
              </Typography>
              <Typography variant="caption" component="div" sx={{ fontFamily: 'monospace', lineHeight: 1.8 }}>
                • <code>{'{{userNote}}'}</code> - User feedback text<br/>
                • <code>{'{{pageUrl}}'}</code> - Page URL<br/>
                • <code>{'{{pageTitle}}'}</code> - Page title<br/>
                • <code>{'{{viewportWidth}}'}</code> - Viewport width<br/>
                • <code>{'{{viewportHeight}}'}</code> - Viewport height<br/>
                • <code>{'{{targetRectX}}'}</code> - Selection X position<br/>
                • <code>{'{{targetRectY}}'}</code> - Selection Y position<br/>
                • <code>{'{{targetRectWidth}}'}</code> - Selection width<br/>
                • <code>{'{{targetRectHeight}}'}</code> - Selection height<br/>
                • <code>{'{{targetSelector}}'}</code> - CSS selector<br/>
                • <code>{'{{reactComponentName}}'}</code> - React component name<br/>
                • <code>{'{{#each consoleLogs}}'}</code> - Iterate console logs<br/>
                • <code>{'{{#each networkRequests}}'}</code> - Iterate network requests<br/>
                • <code>{'{{#each errors}}'}</code> - Iterate JavaScript errors<br/>
                • <code>{'{{annotationId}}'}</code> - Annotation ID<br/>
                • <code>{'{{capturedAt}}'}</code> - Creation timestamp<br/>
                • <code>{'{{screenshotUrl}}'}</code> - Screenshot URL
              </Typography>
            </Paper>
          </Collapse>

          <TextField
            multiline
            rows={12}
            fullWidth
            value={templateValue}
            onChange={handleTemplateChange}
            placeholder="Enter your custom prompt template..."
            variant="outlined"
            sx={{
              fontFamily: 'monospace',
              '& .MuiInputBase-input': {
                fontFamily: 'monospace',
                fontSize: '0.85rem',
              },
            }}
          />

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              onClick={handleResetTemplate}
            >
              Reset to Default
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', ml: 'auto' }}>
              {customPromptTemplate ? 'Using custom template' : 'Using default template'}
            </Typography>
          </Box>
        </Stack>
      </Paper>
    </Stack>
  );
};

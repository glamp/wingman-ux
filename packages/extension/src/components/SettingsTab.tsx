import React from 'react';
import {
  Box,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Switch,
  Typography,
  Paper,
  Stack,
  Divider,
  Select,
  MenuItem,
  InputLabel
} from '@mui/material';
import { useSettingsStore, useAllTemplates } from '@/stores/settings-store';

export const SettingsTab: React.FC = () => {
  const {
    relayUrl,
    showPreviewUrl,
    selectedTemplateId,
    setRelayUrl,
    setShowPreviewUrl,
    setSelectedTemplateId
  } = useSettingsStore();

  const allTemplates = useAllTemplates();

  const handleRelayChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRelayUrl(event.target.value);
  };

  const handlePreviewToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    setShowPreviewUrl(event.target.checked);
  };

  const handleTemplateChange = (event: any) => {
    setSelectedTemplateId(event.target.value);
  };

  return (
    <Stack spacing={3}>
      {/* Output Mode */}
      <Paper elevation={1} sx={{ p: 3 }}>
        <FormControl component="fieldset" fullWidth>
          <FormLabel component="legend" sx={{ mb: 2 }}>
            <Typography variant="subtitle2">Output Mode</Typography>
          </FormLabel>
          <RadioGroup
            value={relayUrl}
            onChange={handleRelayChange}
          >
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
          </RadioGroup>
        </FormControl>
      </Paper>

      <Divider />

      {/* Template Selection */}
      <Paper elevation={1} sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="subtitle2">Output Format</Typography>

          <FormControl fullWidth size="small">
            <InputLabel>Template</InputLabel>
            <Select
              value={selectedTemplateId}
              onChange={handleTemplateChange}
              label="Template"
            >
              {allTemplates.map((template) => (
                <MenuItem key={template.id} value={template.id}>
                  <Box>
                    <Typography variant="body2">
                      {template.name}
                      {template.builtin && (
                        <Typography
                          component="span"
                          variant="caption"
                          color="primary"
                          sx={{ ml: 1 }}
                        >
                          Built-in
                        </Typography>
                      )}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {template.content}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      <Divider />

      {/* Additional Options */}
      <Paper elevation={1} sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="subtitle2">Display Options</Typography>

          <FormControlLabel
            control={
              <Switch
                checked={showPreviewUrl}
                onChange={handlePreviewToggle}
              />
            }
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

      {/* Status */}
      <Box sx={{ textAlign: 'center', pt: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Settings are automatically saved
        </Typography>
      </Box>
    </Stack>
  );
};
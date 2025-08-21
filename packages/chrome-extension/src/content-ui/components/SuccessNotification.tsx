import React, { useState, useEffect, useRef } from 'react';
import {
  Alert,
  Button,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Typography,
  Box,
  TextField,
  InputAdornment,
  Slide,
} from '@mui/material';
import {
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
  OpenInNew as OpenInNewIcon,
  Code as CodeIcon,
} from '@mui/icons-material';
import type { WingmanAnnotation } from '@wingman/shared';
import { formatAnnotationForClaude } from '@wingman/shared';

export interface SuccessNotificationProps {
  previewUrl?: string;
  annotation?: WingmanAnnotation;
  mode?: 'clipboard' | 'server';
  onClose: () => void;
}

const SuccessNotification: React.FC<SuccessNotificationProps> = ({
  previewUrl,
  annotation,
  mode = 'server',
  onClose,
}) => {
  const [open, setOpen] = useState(true);
  const [urlCopied, setUrlCopied] = useState(false);
  const [claudeCopied, setClaudeCopied] = useState(false);
  const [autoDismissTimer, setAutoDismissTimer] = useState<NodeJS.Timeout | null>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Auto-dismiss after 4 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, 4000);
    setAutoDismissTimer(timer);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  const handleClose = () => {
    setOpen(false);
    setTimeout(onClose, 300); // Wait for animation
  };

  const handleMouseEnter = () => {
    if (autoDismissTimer) {
      clearTimeout(autoDismissTimer);
      setAutoDismissTimer(null);
    }
  };

  const handleMouseLeave = () => {
    const timer = setTimeout(() => {
      handleClose();
    }, 4000);
    setAutoDismissTimer(timer);
  };

  const handleCopyUrl = async () => {
    if (!previewUrl) return;
    
    try {
      await navigator.clipboard.writeText(previewUrl);
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = previewUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    }
  };

  const handleCopyForClaude = async () => {
    try {
      const textToCopy = annotation 
        ? formatAnnotationForClaude(annotation)
        : previewUrl || '';
      
      await navigator.clipboard.writeText(textToCopy);
      setClaudeCopied(true);
      setTimeout(() => setClaudeCopied(false), 2000);
    } catch (err) {
      // Fallback
      const tempTextArea = document.createElement('textarea');
      tempTextArea.value = annotation 
        ? formatAnnotationForClaude(annotation)
        : previewUrl || '';
      tempTextArea.style.position = 'fixed';
      tempTextArea.style.left = '-999999px';
      document.body.appendChild(tempTextArea);
      tempTextArea.select();
      document.execCommand('copy');
      document.body.removeChild(tempTextArea);
      setClaudeCopied(true);
      setTimeout(() => setClaudeCopied(false), 2000);
    }
  };

  const handleOpenPreview = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank');
    }
  };

  return (
    <Slide direction="left" in={open} mountOnEnter unmountOnExit>
      <Paper
        ref={notificationRef}
        elevation={8}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        sx={{
          position: 'fixed',
          top: 20,
          right: 20,
          width: 520,
          p: 2.5,
          zIndex: 2147483649,
          pointerEvents: 'all',
        }}
      >
        <IconButton
          size="small"
          onClick={handleClose}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            color: 'text.secondary',
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>

        <Stack spacing={2}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="h6" sx={{ fontSize: 20 }}>
              {mode === 'clipboard' ? '📋' : '✅'}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {mode === 'clipboard' 
                ? 'Feedback copied to clipboard!' 
                : 'Feedback submitted successfully!'}
            </Typography>
          </Box>

          {/* Preview URL section - only for server mode */}
          {mode === 'server' && previewUrl && (
            <>
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  bgcolor: 'grey.50',
                  borderColor: 'grey.300',
                }}
              >
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: 'text.secondary',
                    fontWeight: 500,
                    display: 'block',
                    mb: 0.75,
                  }}
                >
                  Preview URL:
                </Typography>
                <Stack direction="row" spacing={1}>
                  <TextField
                    value={previewUrl}
                    size="small"
                    fullWidth
                    InputProps={{
                      readOnly: true,
                      sx: {
                        fontFamily: '"SF Mono", Monaco, "Cascadia Code", monospace',
                        fontSize: 12,
                        bgcolor: 'white',
                      },
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={handleCopyUrl}
                            title="Copy URL"
                          >
                            {urlCopied ? <CheckIcon fontSize="small" /> : <CopyIcon fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Stack>
              </Paper>

              {/* Action buttons */}
              <Stack direction="row" spacing={1.5} justifyContent="space-between">
                <Button
                  variant="contained"
                  startIcon={<OpenInNewIcon />}
                  onClick={handleOpenPreview}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 500,
                  }}
                >
                  Open Preview
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={claudeCopied ? <CheckIcon /> : <CodeIcon />}
                  onClick={handleCopyForClaude}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 500,
                    ml: 'auto',
                  }}
                >
                  {claudeCopied ? 'Copied!' : 'Copy for Claude Code'}
                </Button>
              </Stack>
            </>
          )}
        </Stack>
      </Paper>
    </Slide>
  );
};

export default SuccessNotification;
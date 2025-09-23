import { Check, ContentCopy } from '@mui/icons-material';
import { Alert, Button, Snackbar, Tooltip } from '@mui/material';
import type { StoredAnnotation } from '@wingman/shared';
import { formatAnnotationForClaude } from '@wingman/shared';
import { useState } from 'react';

interface ClaudeCopyButtonProps {
  annotation: StoredAnnotation;
}

function ClaudeCopyButton({ annotation }: ClaudeCopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);

  const handleCopy = async () => {
    try {
      // Get the current origin for the relay URL
      const relayUrl = window.location.origin;
      // Use the shared formatter with the correct relay URL
      const formattedText = formatAnnotationForClaude(annotation.annotation, { relayUrl });

      // Use simple text copy that includes the embedded base64 image
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(formattedText);
        setCopied(true);
        setShowSnackbar(true);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = formattedText;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          document.execCommand('copy');
          setCopied(true);
          setShowSnackbar(true);
        } catch (err) {
          console.error('Fallback copy failed:', err);
          throw new Error('Copy to clipboard failed');
        } finally {
          document.body.removeChild(textArea);
        }
      }

      // Reset the copied state after 3 seconds
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      setShowSnackbar(true);
    }
  };

  const handleCloseSnackbar = () => {
    setShowSnackbar(false);
  };

  return (
    <>
      <Tooltip
        title={
          copied
            ? 'Copied to clipboard!'
            : 'Copy annotation as markdown with screenshot URL'
        }
      >
        <Button
          variant="contained"
          startIcon={copied ? <Check /> : <ContentCopy />}
          onClick={handleCopy}
          color={copied ? 'success' : 'primary'}
          sx={{
            minWidth: '200px',
            transition: 'all 0.2s ease-in-out',
          }}
        >
          {copied ? 'Copied!' : 'Copy for Claude Code'}
        </Button>
      </Tooltip>

      <Snackbar
        open={showSnackbar}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={copied ? 'success' : 'error'}
          variant="filled"
        >
          {copied
            ? 'Annotation copied! Paste into Claude Code to see text and screenshot.'
            : 'Failed to copy annotation. Please try again.'}
        </Alert>
      </Snackbar>
    </>
  );
}

export default ClaudeCopyButton;

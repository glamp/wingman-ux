import { useState } from 'react';
import { Box, Typography, Button, Chip, Collapse } from '@mui/material';
import { styled } from '@mui/material/styles';
import { GetApp, Code, Extension, ExpandMore, Keyboard } from '@mui/icons-material';
import { colors, gradients, typography } from '../styles/theme';

/**
 * Gradient heading for Chrome Extension section
 */
const GradientHeading = styled(Typography)({
  fontSize: '2em',
  marginBottom: '12px',
  fontWeight: 600,
  textAlign: 'center',
  background: gradients.text,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
});

/**
 * Gradient button for primary actions
 */
const GradientButton = styled(Button)({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '10px',
  padding: '14px 28px',
  background: gradients.primary,
  color: 'white',
  textDecoration: 'none',
  borderRadius: '100px',
  fontWeight: 600,
  fontSize: '1.1em',
  transition: 'all 0.3s ease',
  boxShadow: '0 4px 15px rgba(0, 132, 255, 0.2)',
  border: 'none',
  textTransform: 'none',
  '&:hover': {
    transform: 'translateY(-2px) scale(1.02)',
    boxShadow: '0 8px 25px rgba(0, 132, 255, 0.4)',
    background: gradients.primary,
  },
});

/**
 * Secondary button for alternate actions
 */
const SecondaryButton = styled(Button)({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '10px',
  padding: '14px 28px',
  background: 'white',
  color: colors.primary,
  textDecoration: 'none',
  borderRadius: '100px',
  fontWeight: 600,
  fontSize: '1.1em',
  transition: 'all 0.3s ease',
  border: `2px solid ${colors.primary}`,
  textTransform: 'none',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 15px rgba(0, 132, 255, 0.2)',
    background: 'rgba(0, 132, 255, 0.05)',
  },
});

/**
 * Instruction list with numbered steps
 */
const InstructionList = styled('div')({
  background: 'rgba(255, 255, 255, 0.8)',
  backdropFilter: 'blur(10px)',
  borderRadius: '16px',
  padding: '24px',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  marginTop: '20px',
});

/**
 * Individual instruction item
 */
const InstructionItem = styled('div')({
  display: 'flex',
  alignItems: 'flex-start',
  gap: '16px',
  marginBottom: '16px',
  '&:last-child': {
    marginBottom: 0,
  },
});

/**
 * Instruction number circle
 */
const InstructionNumber = styled('div')({
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  background: gradients.primary,
  color: 'white',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 'bold',
  fontSize: '16px',
  flexShrink: 0,
});

/**
 * Instruction text
 */
const InstructionText = styled(Typography)({
  flex: 1,
  fontSize: '1rem',
  lineHeight: 1.5,
  color: colors.textPrimary,
});

/**
 * Code snippet display
 */
const CodeSnippet = styled('code')({
  background: colors.bgSecondary,
  border: `1px solid ${colors.borderColor}`,
  borderRadius: '4px',
  padding: '2px 6px',
  fontFamily: typography.mono,
  fontSize: '0.9em',
  color: colors.textPrimary,
});

/**
 * Keyboard shortcut display
 */
const KeyboardShortcut = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  marginTop: '16px',
  padding: '12px',
  background: 'rgba(0, 132, 255, 0.1)',
  borderRadius: '8px',
  border: '1px solid rgba(0, 132, 255, 0.2)',
});

/**
 * Chrome Extension section component with improved design
 */
export default function ChromeExtension() {
  const [showInstructions, setShowInstructions] = useState(false);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = '/wingman-chrome-extension.zip';
    link.download = 'wingman-chrome-extension.zip';
    link.click();
  };

  return (
    <Box sx={{ margin: '60px auto 50px', maxWidth: '700px' }}>
      <GradientHeading variant="h2">
        <Extension sx={{ fontSize: '1em', verticalAlign: 'middle', mr: 1 }} />
        Chrome Extension
      </GradientHeading>
      
      <Typography 
        variant="body1" 
        sx={{ 
          fontSize: '1.1em', 
          mb: 4, 
          color: colors.textSecondary,
          textAlign: 'center' 
        }}
      >
        Capture and annotate UI issues directly in your browser
      </Typography>

      <Box sx={{ display: 'flex', gap: 2.5, justifyContent: 'center', mb: 4 }}>
        <GradientButton onClick={handleDownload}>
          <GetApp /> Download Extension
        </GradientButton>
        
        <SecondaryButton onClick={() => setShowInstructions(!showInstructions)}>
          <ExpandMore sx={{ 
            transform: showInstructions ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease'
          }} /> 
          Install Guide
        </SecondaryButton>
      </Box>

      <Collapse in={showInstructions}>
        <InstructionList>
          <InstructionItem>
            <InstructionNumber>1</InstructionNumber>
            <InstructionText>
              Download the extension ZIP file using the button above
            </InstructionText>
          </InstructionItem>
          
          <InstructionItem>
            <InstructionNumber>2</InstructionNumber>
            <InstructionText>
              Open <CodeSnippet>chrome://extensions</CodeSnippet> in your Chrome browser
            </InstructionText>
          </InstructionItem>
          
          <InstructionItem>
            <InstructionNumber>3</InstructionNumber>
            <InstructionText>
              Enable "Developer Mode" using the toggle in the top-right corner
            </InstructionText>
          </InstructionItem>
          
          <InstructionItem>
            <InstructionNumber>4</InstructionNumber>
            <InstructionText>
              Drag and drop the downloaded ZIP file directly onto the extensions page
            </InstructionText>
          </InstructionItem>

          <KeyboardShortcut>
            <Keyboard sx={{ color: colors.primary }} />
            <Typography variant="body2" sx={{ color: colors.textSecondary }}>
              Keyboard shortcut:
            </Typography>
            <CodeSnippet>Alt+Shift+W</CodeSnippet>
            <Typography variant="body2" sx={{ color: colors.textSecondary }}>
              to quickly open Wingman
            </Typography>
          </KeyboardShortcut>
        </InstructionList>
      </Collapse>

      {!showInstructions && (
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Typography variant="body2" sx={{ color: colors.textMuted }}>
            Need help installing? Click "Install Guide" above for step-by-step instructions.
          </Typography>
        </Box>
      )}
    </Box>
  );
}
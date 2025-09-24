import React from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Alert,
  AlertTitle,
  Chip,
  Button,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Link,
  Stack,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Extension as ExtensionIcon,
  Security as SecurityIcon,
  Update as UpdateIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  KeyboardCommandKey as KeyboardIcon,
} from '@mui/icons-material';
import { theme } from '../theme';

const InstallationGuide: React.FC = () => {
  const [activeStep, setActiveStep] = React.useState(0);

  const steps = [
    {
      label: 'Download the Extension',
      content: (
        <Box>
          <Typography paragraph>
            Download the latest version of the Wingman Chrome Extension:
          </Typography>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            href="https://github.com/glamp/wingman-attempt-4/releases/latest"
            target="_blank"
            sx={{ mb: 2 }}
          >
            Download Latest Release
          </Button>
          <Typography variant="body2" color="text.secondary">
            Look for the file named <code>wingman-chrome-extension-v[version].crx</code>
          </Typography>
        </Box>
      ),
    },
    {
      label: 'Open Chrome Extensions',
      content: (
        <Box>
          <Typography paragraph>
            Open Google Chrome and navigate to the extensions page:
          </Typography>
          <ol>
            <li>Type <code>chrome://extensions/</code> in your address bar, OR</li>
            <li>Go to Menu → More Tools → Extensions</li>
          </ol>
        </Box>
      ),
    },
    {
      label: 'Enable Developer Mode',
      content: (
        <Box>
          <Typography paragraph>
            Enable Developer Mode to allow installation of extensions from outside the Chrome Web Store:
          </Typography>
          <ol>
            <li>Look for the "Developer mode" toggle in the top-right corner</li>
            <li>Click to enable it</li>
          </ol>
          <Alert severity="info" sx={{ mt: 2 }}>
            <AlertTitle>Why Developer Mode?</AlertTitle>
            This is required because we distribute directly, bypassing Chrome Web Store review delays.
          </Alert>
        </Box>
      ),
    },
    {
      label: 'Install the Extension',
      content: (
        <Box>
          <Typography paragraph>
            Install the downloaded .crx file:
          </Typography>
          <Typography variant="h6" gutterBottom>Option 1: Drag & Drop (Recommended)</Typography>
          <ol>
            <li>Drag the downloaded .crx file onto the extensions page</li>
            <li>Click "Add extension" when prompted</li>
          </ol>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Option 2: Load Unpacked</Typography>
          <ol>
            <li>Extract the .crx file (it's essentially a zip)</li>
            <li>Click "Load unpacked" on the extensions page</li>
            <li>Select the extracted folder</li>
          </ol>

          <Alert severity="warning" sx={{ mt: 2 }}>
            <AlertTitle><SecurityIcon sx={{ mr: 1 }} />Security Warning Expected</AlertTitle>
            You'll see a warning that the extension "is not from Chrome Web Store" - this is normal and expected.
            Click "Add extension" to proceed.
          </Alert>
        </Box>
      ),
    },
    {
      label: 'Verify Installation',
      content: (
        <Box>
          <Typography paragraph>
            Confirm the extension is working:
          </Typography>
          <ol>
            <li>Look for the Wingman icon in your Chrome toolbar</li>
            <li>Try the keyboard shortcut: <Chip label="Alt + Shift + K" size="small" /> (or <Chip label="Cmd + Shift + K" size="small" /> on Mac)</li>
            <li>Visit any webpage and test the feedback overlay</li>
          </ol>

          <Alert severity="success" sx={{ mt: 2 }}>
            <AlertTitle><CheckIcon sx={{ mr: 1 }} />Automatic Updates</AlertTitle>
            Once installed, Chrome will automatically check for updates every few hours. No action needed!
          </Alert>
        </Box>
      ),
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Hero Section */}
      <Box textAlign="center" mb={6}>
        <Typography variant="h2" component="h1" gutterBottom>
          <ExtensionIcon sx={{ fontSize: 48, mr: 2, verticalAlign: 'middle' }} />
          Installation Guide
        </Typography>
        <Typography variant="h5" color="text.secondary" paragraph>
          Get the Wingman Chrome Extension up and running in minutes
        </Typography>
        <Chip
          label="Self-hosted with automatic updates"
          color="primary"
          icon={<UpdateIcon />}
        />
      </Box>

      {/* Main Installation Steps */}
      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel
                optional={index === steps.length - 1 ? (
                  <Typography variant="caption">Final step</Typography>
                ) : null}
                onClick={() => setActiveStep(index)}
                sx={{ cursor: 'pointer' }}
              >
                {step.label}
              </StepLabel>
              <StepContent>
                {step.content}
                <Box sx={{ mb: 2, mt: 2 }}>
                  <div>
                    {activeStep !== steps.length - 1 && (
                      <Button
                        variant="contained"
                        onClick={() => setActiveStep(index + 1)}
                        sx={{ mt: 1, mr: 1 }}
                      >
                        Continue
                      </Button>
                    )}
                    {index > 0 && (
                      <Button
                        onClick={() => setActiveStep(index - 1)}
                        sx={{ mt: 1, mr: 1 }}
                      >
                        Back
                      </Button>
                    )}
                  </div>
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>

        {activeStep === steps.length && (
          <Paper square elevation={0} sx={{ p: 3, bgcolor: 'success.light' }}>
            <Typography variant="h6" gutterBottom>
              🎉 Installation Complete!
            </Typography>
            <Typography paragraph>
              You're all set! The Wingman extension will now help you provide better UX feedback.
            </Typography>
            <Button onClick={() => setActiveStep(0)} sx={{ mt: 1, mr: 1 }}>
              Review Steps
            </Button>
            <Button variant="contained" href="/" sx={{ mt: 1, mr: 1 }}>
              Get Started
            </Button>
          </Paper>
        )}
      </Paper>

      {/* FAQ Section */}
      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Frequently Asked Questions
        </Typography>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Why isn't this in the Chrome Web Store?</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography paragraph>
              We distribute directly to avoid Chrome Web Store review delays and maintain faster iteration cycles.
              This approach gives us more control over releases while still providing automatic updates.
            </Typography>
            <Typography paragraph>
              The extension is completely safe - you can review the source code on GitHub and the automatic
              update mechanism uses the same technology as the Chrome Web Store.
            </Typography>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Is the security warning dangerous?</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography paragraph>
              No, the warning is just Chrome's way of informing you that the extension isn't distributed through
              their official store. This is a standard security measure.
            </Typography>
            <Typography paragraph>
              The extension is built with the same security standards as any Chrome Web Store extension.
              You only see this warning once during installation.
            </Typography>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">How do automatic updates work?</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography paragraph>
              Chrome automatically checks for updates every few hours using a standard update manifest.
              When a new version is available, it downloads and installs silently in the background.
            </Typography>
            <Typography paragraph>
              No user action is required - updates happen automatically just like extensions from the Chrome Web Store.
            </Typography>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">What if installation fails?</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography paragraph>
              If drag-and-drop doesn't work:
            </Typography>
            <ol>
              <li>Try the "Load unpacked" method instead</li>
              <li>Extract the .crx file and select the extracted folder</li>
              <li>Make sure Developer Mode is enabled</li>
              <li>Clear your browser cache and try again</li>
            </ol>
            <Typography paragraph>
              Still having issues? Check our <Link href="#troubleshooting">troubleshooting section</Link> below.
            </Typography>
          </AccordionDetails>
        </Accordion>
      </Paper>

      {/* Usage Guide */}
      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Getting Started
        </Typography>

        <Stack spacing={3}>
          <Box>
            <Typography variant="h6" gutterBottom>
              <KeyboardIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Keyboard Shortcuts
            </Typography>
            <Typography paragraph>
              The fastest way to activate Wingman feedback:
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <Chip label="Alt + Shift + K" variant="outlined" />
              <Typography variant="body2" sx={{ alignSelf: 'center' }}>or</Typography>
              <Chip label="Cmd + Shift + K" variant="outlined" />
              <Typography variant="body2" sx={{ alignSelf: 'center' }}>(Mac)</Typography>
            </Stack>
          </Box>

          <Divider />

          <Box>
            <Typography variant="h6" gutterBottom>
              Extension Popup
            </Typography>
            <Typography paragraph>
              Click the Wingman icon in your Chrome toolbar to:
            </Typography>
            <ul>
              <li>Configure server settings</li>
              <li>Choose output format (Claude Code, JSON, etc.)</li>
              <li>View connection status</li>
              <li>Access help and documentation</li>
            </ul>
          </Box>

          <Divider />

          <Box>
            <Typography variant="h6" gutterBottom>
              Feedback Modes
            </Typography>
            <Typography paragraph>
              The extension supports multiple feedback modes:
            </Typography>
            <ul>
              <li><strong>Element Selection:</strong> Click specific UI elements to provide targeted feedback</li>
              <li><strong>Region Selection:</strong> Draw rectangles around areas of interest</li>
              <li><strong>Copy to Clipboard:</strong> Generate formatted feedback for Claude Code</li>
              <li><strong>Server Submission:</strong> Send feedback directly to your development server</li>
            </ul>
          </Box>
        </Stack>
      </Paper>

      {/* Troubleshooting */}
      <Paper elevation={3} sx={{ p: 4 }} id="troubleshooting">
        <Typography variant="h4" gutterBottom>
          Troubleshooting
        </Typography>

        <Alert severity="info" sx={{ mb: 3 }}>
          <AlertTitle>Common Issues</AlertTitle>
          Most installation problems are resolved by enabling Developer Mode and using Chrome's latest version.
        </Alert>

        <Typography variant="h6" gutterBottom>
          Extension Won't Install
        </Typography>
        <ul>
          <li>Ensure Developer Mode is enabled in chrome://extensions/</li>
          <li>Try downloading the file again (it might be corrupted)</li>
          <li>Use a different installation method (drag-drop vs load unpacked)</li>
          <li>Restart Chrome and try again</li>
        </ul>

        <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
          Extension Icon Not Visible
        </Typography>
        <ul>
          <li>Check if the extension is enabled in chrome://extensions/</li>
          <li>Look for the icon in the extensions menu (puzzle piece icon)</li>
          <li>Pin the extension to your toolbar</li>
        </ul>

        <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
          Keyboard Shortcut Not Working
        </Typography>
        <ul>
          <li>Check if another extension is using the same shortcut</li>
          <li>Try using the extension popup instead</li>
          <li>Restart Chrome to refresh shortcut bindings</li>
        </ul>

        <Box sx={{ mt: 4, p: 3, bgcolor: 'info.light', borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>
            Still Need Help?
          </Typography>
          <Typography paragraph>
            For additional support, check out:
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              href="https://github.com/glamp/wingman-attempt-4"
              target="_blank"
            >
              GitHub Repository
            </Button>
            <Button
              variant="outlined"
              href="https://github.com/glamp/wingman-attempt-4/issues"
              target="_blank"
            >
              Report an Issue
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Container>
  );
};

export default InstallationGuide;
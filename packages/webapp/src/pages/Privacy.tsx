import { Container, Typography, Box, Paper, Stack, Divider } from '@mui/material';

export default function Privacy() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 8 } }}>
      <Box>
        <Box textAlign="center" mb={6}>
          <Typography variant="h1" sx={{ fontSize: '48px', mb: 2 }}>
            🛡️
          </Typography>
          <Typography variant="h2" component="h1" fontWeight="bold" gutterBottom>
            Privacy Policy
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Last Updated: September 26, 2024
          </Typography>
        </Box>

        <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, backgroundColor: 'background.default', border: '1px solid', borderColor: 'divider' }}>
          <Stack spacing={4}>
            {/* Overview */}
            <Box>
              <Typography variant="h5" gutterBottom fontWeight="600">
                Overview
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Wingman is committed to protecting your privacy. This Privacy Policy explains how we handle
                information when you use our Chrome extension for capturing UI feedback.
              </Typography>
            </Box>

            <Divider />

            {/* What We Don't Collect */}
            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Typography variant="h5" fontWeight="600">
                  🔒 Information We DO NOT Collect
                </Typography>
              </Box>
              <Typography variant="body1" color="text.secondary" paragraph>
                Wingman operates entirely within your browser. We do not:
              </Typography>
              <Box component="ul" sx={{ pl: 3, '& li': { mb: 1 } }}>
                <Typography component="li" variant="body1" color="text.secondary">
                  Collect personal information
                </Typography>
                <Typography component="li" variant="body1" color="text.secondary">
                  Track your browsing history
                </Typography>
                <Typography component="li" variant="body1" color="text.secondary">
                  Store your data on our servers
                </Typography>
                <Typography component="li" variant="body1" color="text.secondary">
                  Share data with third parties
                </Typography>
                <Typography component="li" variant="body1" color="text.secondary">
                  Use analytics or tracking tools
                </Typography>
                <Typography component="li" variant="body1" color="text.secondary">
                  Require account creation
                </Typography>
                <Typography component="li" variant="body1" color="text.secondary">
                  Access your data without your explicit action
                </Typography>
              </Box>
            </Box>

            <Divider />

            {/* Local Processing */}
            <Box>
              <Typography variant="h5" gutterBottom fontWeight="600">
                Information Processed Locally
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                When you actively use Wingman to capture feedback, the following information is processed
                entirely within your browser:
              </Typography>

              <Stack spacing={3}>
                <Box>
                  <Typography variant="h6" gutterBottom>Screenshot Data</Typography>
                  <Box component="ul" sx={{ pl: 3, '& li': { mb: 0.5 } }}>
                    <Typography component="li" variant="body2" color="text.secondary">
                      Visual capture of the current browser tab (only when you initiate capture)
                    </Typography>
                    <Typography component="li" variant="body2" color="text.secondary">
                      Element highlighting and selection markers
                    </Typography>
                  </Box>
                </Box>

                <Box>
                  <Typography variant="h6" gutterBottom>Page Context</Typography>
                  <Box component="ul" sx={{ pl: 3, '& li': { mb: 0.5 } }}>
                    <Typography component="li" variant="body2" color="text.secondary">
                      Current page URL and title
                    </Typography>
                    <Typography component="li" variant="body2" color="text.secondary">
                      Selected element's CSS selectors and properties
                    </Typography>
                    <Typography component="li" variant="body2" color="text.secondary">
                      Console logs and errors (if present)
                    </Typography>
                    <Typography component="li" variant="body2" color="text.secondary">
                      Network timing information
                    </Typography>
                    <Typography component="li" variant="body2" color="text.secondary">
                      React component metadata (when available)
                    </Typography>
                  </Box>
                </Box>

                <Box>
                  <Typography variant="h6" gutterBottom>User Preferences</Typography>
                  <Box component="ul" sx={{ pl: 3, '& li': { mb: 0.5 } }}>
                    <Typography component="li" variant="body2" color="text.secondary">
                      Your chosen output mode (Clipboard, Local, or Remote)
                    </Typography>
                    <Typography component="li" variant="body2" color="text.secondary">
                      Custom server URL (if configured)
                    </Typography>
                    <Typography component="li" variant="body2" color="text.secondary">
                      Stored locally using Chrome's storage API
                    </Typography>
                  </Box>
                </Box>
              </Stack>
            </Box>

            <Divider />

            {/* Data Destinations */}
            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Typography variant="h5" fontWeight="600">
                  🌐 Data Destinations
                </Typography>
              </Box>
              <Typography variant="body1" color="text.secondary" paragraph>
                You control where captured feedback is sent:
              </Typography>

              <Stack spacing={2}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                    📋 Clipboard Mode
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Data is copied to your system clipboard. No network transmission occurs.
                  </Typography>
                </Paper>

                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                    💻 Local Mode
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Data is sent to a localhost server you specify. Transmission occurs only within your local machine.
                  </Typography>
                </Paper>

                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                    🌐 Remote Mode
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Data is sent to a server URL you configure. You are responsible for the security of your chosen endpoint.
                  </Typography>
                </Paper>
              </Stack>
            </Box>

            <Divider />

            {/* Permissions */}
            <Box>
              <Typography variant="h5" gutterBottom fontWeight="600">
                Chrome Permissions Explained
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                The extension requires certain permissions to function:
              </Typography>
              <Box component="ul" sx={{ pl: 3, '& li': { mb: 1 } }}>
                <Typography component="li" variant="body2" color="text.secondary">
                  <strong>activeTab:</strong> To capture screenshots of the active tab (only when you trigger it)
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  <strong>scripting:</strong> To inject the element selection overlay
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  <strong>tabs:</strong> To access tab information for context
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  <strong>storage:</strong> To save your preferences locally
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  <strong>downloads:</strong> To optionally save screenshots to your device
                </Typography>
              </Box>
            </Box>

            <Divider />

            {/* Open Source */}
            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Typography variant="h5" fontWeight="600">
                  💻 Open Source Transparency
                </Typography>
              </Box>
              <Typography variant="body1" color="text.secondary" paragraph>
                Wingman is open source software. You can review our code to verify our privacy practices.
              </Typography>
            </Box>

            <Divider />

            {/* Contact */}
            <Box>
              <Typography variant="h5" gutterBottom fontWeight="600">
                Contact
              </Typography>
              <Typography variant="body1" color="text.secondary">
                For questions about this Privacy Policy or Wingman's privacy practices,
                please open an issue on our GitHub repository.
              </Typography>
            </Box>

            <Divider />

            {/* Footer */}
            <Box textAlign="center" pt={2}>
              <Typography variant="body2" color="text.secondary">
                © 2024 Wingman. MIT Licensed Open Source Software.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                By using Wingman, you consent to this Privacy Policy.
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Box>
    </Container>
  );
}
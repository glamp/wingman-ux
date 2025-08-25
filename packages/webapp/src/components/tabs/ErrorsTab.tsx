import React, { useState } from 'react';
import { 
  Box, 
  List, 
  ListItem, 
  Typography, 
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Paper
} from '@mui/material';
import { 
  ExpandMore as ExpandMoreIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import type { WingmanAnnotation } from '@wingman/shared';

interface ErrorsTabProps {
  errors: WingmanAnnotation['errors'];
}

function ErrorsTab({ errors }: ErrorsTabProps) {
  const [expanded, setExpanded] = useState<number | false>(false);

  const handleChange = (panel: number) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  const formatTimestamp = (ts: number) => {
    return new Date(ts).toLocaleString();
  };

  const parseStackTrace = (stack?: string) => {
    if (!stack) return [];
    
    return stack
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  };

  if (errors.length === 0) {
    return (
      <Box sx={{ pt: 6, px: 3, pb: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">
          No JavaScript errors captured
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ErrorIcon color="error" />
          JavaScript Errors ({errors.length})
        </Typography>
      </Box>

      <List sx={{ p: 0 }}>
        {errors.map((error, index) => {
          const stackLines = parseStackTrace(error.stack);
          const errorTitle = error.message.split('\n')[0]; // First line as title
          
          return (
            <ListItem key={index} sx={{ p: 0, display: 'block' }}>
              <Accordion 
                expanded={expanded === index} 
                onChange={handleChange(index)}
                sx={{ 
                  boxShadow: 'none', 
                  border: 'none',
                  '&:before': { display: 'none' },
                  '&.Mui-expanded': { margin: 0 }
                }}
              >
                <AccordionSummary 
                  expandIcon={<ExpandMoreIcon />}
                  sx={{ 
                    borderBottom: 1, 
                    borderColor: 'divider',
                    '&.Mui-expanded': { minHeight: 'unset' },
                    '& .MuiAccordionSummary-content': { 
                      alignItems: 'center',
                      '&.Mui-expanded': { margin: '12px 0' }
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    <ErrorIcon sx={{ color: 'error.main', fontSize: '20px' }} />
                    
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          fontWeight: 'bold',
                          color: 'error.main',
                          wordBreak: 'break-word'
                        }}
                      >
                        {errorTitle}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        color="text.secondary"
                        sx={{ fontFamily: 'monospace' }}
                      >
                        {formatTimestamp(error.ts)}
                      </Typography>
                    </Box>
                    
                    <Chip 
                      label="Error" 
                      size="small" 
                      color="error" 
                      variant="outlined"
                    />
                  </Box>
                </AccordionSummary>
                
                <AccordionDetails sx={{ pt: 0 }}>
                  {/* Full Error Message */}
                  <Paper 
                    sx={{ 
                      p: 2, 
                      mb: 2, 
                      backgroundColor: 'error.dark',
                      color: 'error.contrastText'
                    }}
                    elevation={0}
                  >
                    <Typography 
                      variant="subtitle2" 
                      gutterBottom
                      sx={{ color: 'inherit', fontWeight: 'bold' }}
                    >
                      Error Message:
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        color: 'inherit'
                      }}
                    >
                      {error.message}
                    </Typography>
                  </Paper>

                  {/* Stack Trace */}
                  {stackLines.length > 0 && (
                    <Paper 
                      sx={{ 
                        p: 2, 
                        backgroundColor: 'action.hover'
                      }}
                      elevation={0}
                      variant="outlined"
                    >
                      <Typography 
                        variant="subtitle2" 
                        gutterBottom
                        sx={{ fontWeight: 'bold' }}
                      >
                        Stack Trace:
                      </Typography>
                      <Box component="pre" sx={{ 
                        margin: 0,
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        lineHeight: 1.4,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        color: 'text.primary'
                      }}>
                        {stackLines.map((line, lineIndex) => (
                          <Box 
                            key={lineIndex}
                            sx={{ 
                              py: 0.25,
                              px: 1,
                              mx: -1,
                              borderRadius: 1,
                              '&:hover': { 
                                backgroundColor: 'action.selected' 
                              }
                            }}
                          >
                            {line}
                          </Box>
                        ))}
                      </Box>
                    </Paper>
                  )}
                </AccordionDetails>
              </Accordion>
            </ListItem>
          );
        })}
      </List>

      {/* Error Summary */}
      <Paper sx={{ m: 2, p: 2, backgroundColor: 'action.hover' }} elevation={0}>
        <Typography variant="subtitle2" gutterBottom>
          Error Summary
        </Typography>
        <Typography variant="body2">
          <strong>Total Errors:</strong> {errors.length}
        </Typography>
      </Paper>
    </Box>
  );
}

export default ErrorsTab;
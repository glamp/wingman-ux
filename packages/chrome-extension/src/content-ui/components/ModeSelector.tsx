import React from 'react';
import { Box, Button } from '@mui/material';
import { 
  CropFree as ElementIcon,
} from '@mui/icons-material';

export interface ModeSelectorProps {
  disabled?: boolean;
}

const ModeSelector: React.FC<ModeSelectorProps> = ({
  disabled = false,
}) => {
  return (
    <Box
      id="wingman-mode-selector"
      sx={{
        position: 'fixed',
        top: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 2147483648,
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        padding: '8px',
      }}
    >
      <Button
        variant="contained"
        disabled={disabled}
        startIcon={<ElementIcon />}
        sx={{
          textTransform: 'none',
          minWidth: 120,
          backgroundColor: '#0084ff',
          '&:hover': {
            backgroundColor: '#0070e0',
          },
        }}
      >
        Select Element
      </Button>
    </Box>
  );
};

export default ModeSelector;
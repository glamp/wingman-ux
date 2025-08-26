import { Paper, PaperProps } from '@mui/material';
import { forwardRef } from 'react';

/**
 * White card component with pure white background
 * Used throughout the app for consistent card styling
 */
const WhiteCard = forwardRef<HTMLDivElement, PaperProps>((props, ref) => {
  return (
    <Paper
      {...props}
      ref={ref}
      elevation={0}
      sx={{
        background: '#ffffff !important',
        backgroundColor: '#ffffff !important',
        backgroundImage: 'none !important',
        border: 'none',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        ...props.sx
      }}
    />
  );
});

WhiteCard.displayName = 'WhiteCard';

export default WhiteCard;
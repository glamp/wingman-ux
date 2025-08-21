import React, { useState, useEffect, useCallback } from 'react';
import { Box, keyframes } from '@mui/material';
import { getTargetElement } from '../utils/domHelpers';

export interface ElementSelectorProps {
  active: boolean;
  onSelect: (element: HTMLElement, rect: DOMRect) => void;
}

// Keyframe animations

const marchingAnts = keyframes`
  0% {
    stroke-dashoffset: 0;
  }
  100% {
    stroke-dashoffset: 12;
  }
`;

const cornerPulse = keyframes`
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.1);
  }
`;

const ElementSelector: React.FC<ElementSelectorProps> = ({
  active,
  onSelect,
}) => {
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [currentElement, setCurrentElement] = useState<HTMLElement | null>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!active) return;
    
    const element = getTargetElement(e.clientX, e.clientY, [
      'wingman-overlay-host',
      'wingman-highlighter',
      'wingman-corner-accent'
    ]);
    
    if (element && element !== currentElement) {
      const rect = element.getBoundingClientRect();
      setHighlightRect(rect);
      setCurrentElement(element);
    } else if (!element) {
      setHighlightRect(null);
      setCurrentElement(null);
    }
  }, [active, currentElement]);

  const handleClick = useCallback((e: MouseEvent) => {
    if (!active) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const element = getTargetElement(e.clientX, e.clientY, [
      'wingman-overlay-host',
      'wingman-highlighter',
      'wingman-corner-accent'
    ]);
    
    if (element) {
      const rect = element.getBoundingClientRect();
      onSelect(element, rect);
    }
  }, [active, onSelect]);

  useEffect(() => {
    if (active) {
      // Use capture phase to intercept before page handlers
      document.addEventListener('mousemove', handleMouseMove, true);
      document.addEventListener('click', handleClick, true);
      
      // Prevent page interactions
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'crosshair';
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove, true);
      document.removeEventListener('click', handleClick, true);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [active, handleMouseMove, handleClick]);

  if (!active || !highlightRect) return null;

  const cornerSize = 20;
  const cornerThickness = 3;

  return (
    <>
      {/* Main highlight box with background */}
      <Box
        id="wingman-highlighter"
        sx={{
          position: 'fixed',
          left: highlightRect.left,
          top: highlightRect.top,
          width: highlightRect.width,
          height: highlightRect.height,
          pointerEvents: 'none',
          transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 2147483646,
          backgroundColor: 'rgba(0, 132, 255, 0.08)',
          borderRadius: '4px',
        }}
      />
      
      {/* SVG marching ants border */}
      <svg
        style={{
          position: 'fixed',
          left: highlightRect.left - 2,
          top: highlightRect.top - 2,
          width: highlightRect.width + 4,
          height: highlightRect.height + 4,
          pointerEvents: 'none',
          zIndex: 2147483647,
        }}
      >
        <rect
          x="1"
          y="1"
          width={highlightRect.width + 2}
          height={highlightRect.height + 2}
          fill="none"
          stroke="#0084ff"
          strokeWidth="2"
          strokeDasharray="8 4"
          rx="4"
          ry="4"
          style={{
            animation: `${marchingAnts} 0.5s linear infinite`,
          }}
        />
      </svg>
      
      {/* Corner accents - Top Left */}
      <Box
        className="wingman-corner-accent"
        sx={{
          position: 'fixed',
          left: highlightRect.left - 2,
          top: highlightRect.top - 2,
          width: cornerSize,
          height: cornerSize,
          pointerEvents: 'none',
          zIndex: 2147483647,
          animation: `${cornerPulse} 2s ease-in-out infinite`,
          transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
          
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: cornerThickness,
            background: 'linear-gradient(90deg, #00d4ff, #0084ff)',
            boxShadow: '0 0 10px rgba(0, 212, 255, 0.5)',
          },
          
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            width: cornerThickness,
            height: '100%',
            background: 'linear-gradient(180deg, #00d4ff, #0084ff)',
            boxShadow: '0 0 10px rgba(0, 212, 255, 0.5)',
          },
        }}
      />
      
      {/* Corner accents - Top Right */}
      <Box
        className="wingman-corner-accent"
        sx={{
          position: 'fixed',
          left: highlightRect.left + highlightRect.width - cornerSize + 2,
          top: highlightRect.top - 2,
          width: cornerSize,
          height: cornerSize,
          pointerEvents: 'none',
          zIndex: 2147483647,
          animation: `${cornerPulse} 2s ease-in-out infinite 0.5s`,
          transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
          
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            right: 0,
            width: '100%',
            height: cornerThickness,
            background: 'linear-gradient(90deg, #0084ff, #00d4ff)',
            boxShadow: '0 0 10px rgba(0, 212, 255, 0.5)',
          },
          
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            right: 0,
            width: cornerThickness,
            height: '100%',
            background: 'linear-gradient(180deg, #00d4ff, #0084ff)',
            boxShadow: '0 0 10px rgba(0, 212, 255, 0.5)',
          },
        }}
      />
      
      {/* Corner accents - Bottom Left */}
      <Box
        className="wingman-corner-accent"
        sx={{
          position: 'fixed',
          left: highlightRect.left - 2,
          top: highlightRect.top + highlightRect.height - cornerSize + 2,
          width: cornerSize,
          height: cornerSize,
          pointerEvents: 'none',
          zIndex: 2147483647,
          animation: `${cornerPulse} 2s ease-in-out infinite 1s`,
          transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
          
          '&::before': {
            content: '""',
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            height: cornerThickness,
            background: 'linear-gradient(90deg, #00d4ff, #0084ff)',
            boxShadow: '0 0 10px rgba(0, 212, 255, 0.5)',
          },
          
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: cornerThickness,
            height: '100%',
            background: 'linear-gradient(180deg, #0084ff, #00d4ff)',
            boxShadow: '0 0 10px rgba(0, 212, 255, 0.5)',
          },
        }}
      />
      
      {/* Corner accents - Bottom Right */}
      <Box
        className="wingman-corner-accent"
        sx={{
          position: 'fixed',
          left: highlightRect.left + highlightRect.width - cornerSize + 2,
          top: highlightRect.top + highlightRect.height - cornerSize + 2,
          width: cornerSize,
          height: cornerSize,
          pointerEvents: 'none',
          zIndex: 2147483647,
          animation: `${cornerPulse} 2s ease-in-out infinite 1.5s`,
          transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
          
          '&::before': {
            content: '""',
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: '100%',
            height: cornerThickness,
            background: 'linear-gradient(90deg, #0084ff, #00d4ff)',
            boxShadow: '0 0 10px rgba(0, 212, 255, 0.5)',
          },
          
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: cornerThickness,
            height: '100%',
            background: 'linear-gradient(180deg, #0084ff, #00d4ff)',
            boxShadow: '0 0 10px rgba(0, 212, 255, 0.5)',
          },
        }}
      />
    </>
  );
};

export default ElementSelector;
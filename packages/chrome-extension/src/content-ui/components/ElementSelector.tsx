import React, { useState, useEffect, useCallback } from 'react';
import { Box } from '@mui/material';
import { getTargetElement } from '../utils/domHelpers';

export interface ElementSelectorProps {
  active: boolean;
  onSelect: (element: HTMLElement, rect: DOMRect) => void;
}

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
      'wingman-highlighter'
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
      'wingman-highlighter'
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

  return (
    <Box
      id="wingman-highlighter"
      sx={{
        position: 'fixed',
        left: highlightRect.left,
        top: highlightRect.top,
        width: highlightRect.width,
        height: highlightRect.height,
        border: '2px solid #0084ff',
        backgroundColor: 'rgba(0, 132, 255, 0.1)',
        pointerEvents: 'none',
        transition: 'all 0.1s ease',
        zIndex: 2147483646,
      }}
    />
  );
};

export default ElementSelector;
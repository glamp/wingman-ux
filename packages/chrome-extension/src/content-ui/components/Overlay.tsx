import React, { useState, useEffect, useCallback } from 'react';
import { Box } from '@mui/material';
import ElementSelector from './ElementSelector';
import NotePanel from './NotePanel/NotePanel';
import { generateSelector } from '../utils/domHelpers';

export interface OverlayProps {
  onSubmit: (note: string, target: any, element?: HTMLElement) => void;
  onCancel: () => void;
}

const Overlay: React.FC<OverlayProps> = ({ onSubmit, onCancel }) => {
  const [selectorActive, setSelectorActive] = useState(true);
  const [notePanelVisible, setNotePanelVisible] = useState(false);
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);
  const [selectedRect, setSelectedRect] = useState<DOMRect | null>(null);
  const [mode] = useState<'element' | 'region'>('element'); // For now, only element mode

  const handleElementSelect = useCallback((element: HTMLElement, rect: DOMRect) => {
    setSelectedElement(element);
    setSelectedRect(rect);
    setSelectorActive(false);
    setNotePanelVisible(true);
  }, []);

  const handleNoteSubmit = useCallback((note: string) => {
    if (!selectedElement || !selectedRect) return;
    
    const target = {
      mode,
      rect: {
        x: selectedRect.left,
        y: selectedRect.top,
        width: selectedRect.width,
        height: selectedRect.height,
      },
      selector: generateSelector(selectedElement),
    };
    
    onSubmit(note, target, selectedElement);
  }, [selectedElement, selectedRect, mode, onSubmit]);

  const handleCancel = useCallback(() => {
    onCancel();
  }, [onCancel]);

  // Listen for ESC key at overlay level
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !notePanelVisible) {
        handleCancel();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [notePanelVisible, handleCancel]);

  // Set pointer-events based on state
  useEffect(() => {
    const host = document.getElementById('wingman-overlay-host');
    if (host) {
      host.style.pointerEvents = selectorActive ? 'all' : 'none';
    }
  }, [selectorActive]);

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: selectorActive ? 'all' : 'none',
      }}
    >
      <ElementSelector
        active={selectorActive}
        onSelect={handleElementSelect}
      />
      
      {selectedRect && (
        <Box
          sx={{
            position: 'fixed',
            left: selectedRect.left,
            top: selectedRect.top,
            width: selectedRect.width,
            height: selectedRect.height,
            border: '2px solid #00d4ff',
            backgroundColor: 'rgba(0, 212, 255, 0.08)',
            boxShadow: '0 0 20px rgba(0, 212, 255, 0.3), inset 0 0 20px rgba(0, 212, 255, 0.1)',
            pointerEvents: 'none',
            zIndex: 2147483645,
            borderRadius: '4px',
          }}
        />
      )}
      
      <NotePanel
        visible={notePanelVisible}
        onSubmit={handleNoteSubmit}
        onCancel={handleCancel}
      />
    </Box>
  );
};

export default Overlay;
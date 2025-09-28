import React, { useState, useEffect, useCallback } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import ElementSelector from './ElementSelector';
import NotePanel from './NotePanel/NotePanel';
import { generateSelector } from '../utils/domHelpers';

export interface OverlayProps {
  onSubmit: (note: string, target: any, element?: HTMLElement, screenshot?: string) => void;
  onCancel: () => void;
}

const Overlay: React.FC<OverlayProps> = ({ onSubmit, onCancel }) => {
  const [selectorActive, setSelectorActive] = useState(true);
  const [notePanelVisible, setNotePanelVisible] = useState(false);
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);
  const [selectedRect, setSelectedRect] = useState<DOMRect | null>(null);
  const [capturedScreenshot, setCapturedScreenshot] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const handleElementSelect = useCallback((element: HTMLElement, rect: DOMRect) => {
    setSelectedElement(element);
    setSelectedRect(rect);
    setSelectorActive(false);
    setIsCapturing(true);

    // Request screenshot capture BEFORE showing dialog
    chrome.runtime.sendMessage(
      { type: 'CAPTURE_SCREENSHOT_ONLY' },
      (response) => {
        if (response?.success && response?.screenshot) {
          setCapturedScreenshot(response.screenshot);
          setIsCapturing(false);
          setNotePanelVisible(true);  // Only show dialog AFTER screenshot
        } else {
          console.error('Screenshot capture failed:', response?.error);
          setIsCapturing(false);
          // Still show the dialog but without screenshot
          setNotePanelVisible(true);
        }
      }
    );
  }, []);

  const handleNoteSubmit = useCallback((note: string) => {
    if (!selectedElement || !selectedRect) return;
    
    const target = {
      mode: 'element' as const,
      rect: {
        x: selectedRect.left,
        y: selectedRect.top,
        width: selectedRect.width,
        height: selectedRect.height,
      },
      selector: generateSelector(selectedElement),
    };
    
    onSubmit(note, target, selectedElement, capturedScreenshot || undefined);
  }, [selectedElement, selectedRect, onSubmit, capturedScreenshot]);

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
      // Always allow pointer events through the host when note panel is visible
      // The overlay Box component will control pointer events for the selector
      host.style.pointerEvents = notePanelVisible ? 'all' : (selectorActive ? 'all' : 'none');
    }
  }, [selectorActive, notePanelVisible]);

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: selectorActive ? 'all' : 'none'
      }}
    >
      {/* Element selector */}
      <ElementSelector
        active={selectorActive}
        onSelect={handleElementSelect}
      />
      
      {/* Selected element highlight */}
      {selectedRect && (
        <Box
          sx={{
            position: 'fixed',
            left: selectedRect.left,
            top: selectedRect.top,
            width: selectedRect.width,
            height: selectedRect.height,
            border: '2px solid #0084ff',
            // Removed backgroundColor to keep page colors unchanged
            boxShadow: '0 0 20px rgba(0, 132, 255, 0.3)',
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
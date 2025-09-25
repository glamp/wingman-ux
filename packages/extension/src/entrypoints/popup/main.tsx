import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('popup-root');
if (!container) {
  throw new Error('Popup root element not found');
}

const root = createRoot(container);
root.render(<App />);
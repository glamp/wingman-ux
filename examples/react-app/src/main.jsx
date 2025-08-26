import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { WingmanProvider } from 'wingman-sdk';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <WingmanProvider config={{ enabled: true, debug: true }}>
      <App />
    </WingmanProvider>
  </StrictMode>
);

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/index.css';

createRoot(document.getElementById('admin-root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { applyTheme, readThemeChoice } from './theme';
import './index.css';

const savedTheme = readThemeChoice();
if (savedTheme) applyTheme(savedTheme);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global fetch interceptor to attach JWT token to all /api/ requests
const originalFetch = window.fetch;
window.fetch = async (input, init = {}) => {
  if (typeof input === "string" && input.startsWith("/api/")) {
    const token = localStorage.getItem("choho_token");
    if (token) {
      init.headers = {
        ...init.headers,
        Authorization: `Bearer ${token}`
      };
    }
  }
  return originalFetch(input, init);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

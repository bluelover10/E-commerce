import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// The light/dark toggles were removed — clear the keys they used to persist,
// so stale values can never resurrect a dark UI anywhere.
localStorage.removeItem("theme");
localStorage.removeItem("gp-admin-theme");

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { GeneratePage } from './pages/GeneratePage.tsx'

const path = window.location.pathname.replace(/\/$/, '');
const isGeneratePage = path === '/generate' || path.endsWith('/generate');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isGeneratePage ? <GeneratePage /> : <App />}
  </StrictMode>,
)

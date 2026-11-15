import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { presentationServices } from './data/presentation.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App services={presentationServices} />
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { FabricProvider } from './contexts/FabricContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <FabricProvider>
    <App />
    </FabricProvider>
  </StrictMode>,
)

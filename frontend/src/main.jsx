import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register' 

const updateSW = registerSW({
  onNeedRefresh() {
    // registerType is 'autoUpdate' — that's a promise to actually activate
    // and reload automatically, not just log it. Without this call the new
    // service worker sits "waiting" forever and the tab keeps running
    // whatever JS was cached at last visit, silently, with no error — which
    // is exactly what made an already-fixed bug (the invisible PIN modal)
    // look like it was still broken after the fix had shipped.
    updateSW(true)
  },
  onOfflineReady() {
    console.log("App is ready to work offline!")
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
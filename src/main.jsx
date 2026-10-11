
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './providers/AuthProvider';
import { Toaster } from 'react-hot-toast';
  
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
         <Toaster position="top-right" /> {/* <= di sini */}
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)

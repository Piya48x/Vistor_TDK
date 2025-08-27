
import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App.jsx'
import PrintSlip from './slip/PrintSlip.jsx'
import './styles.css'
import Report from './slip/report.jsx'
import SlipFromQR from './slip/SlipFromQR.jsx'
import VisitorPage from './VisitorPage.jsx'

const router = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/print/:id', element: <PrintSlip /> },
  { path: '/Report', element: <Report /> },
  { path: '/SlipFromQR', element: <SlipFromQR /> },
  { path: '/VisitorPage/:id', element: <VisitorPage /> },

])

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)

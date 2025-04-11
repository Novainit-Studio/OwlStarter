import './assets/main.css'

import React from 'react'
import ReactDOM from 'react-dom/client'
import Router from './router'
import { BrowserRouter } from 'react-router-dom'
import SideBar from './components/SideBar'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <div className='flex h-screen'>
      <SideBar />
      <BrowserRouter>
        <div className='flex-1 overflow-auto'>
          <Router />
        </div>
      </BrowserRouter>
    </div>
  </React.StrictMode>
)

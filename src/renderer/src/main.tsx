import './assets/main.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import Router from './router'
import { BrowserRouter } from 'react-router-dom'
import SideBar from './components/SideBar'
import Footer from './components/Footer'
import { SidebarProvider, useSidebar } from './context/SidebarContext'

const MainContent = () => {
  const { collapsed } = useSidebar();
  return (
    <div className={`flex h-screen`}>
      <SideBar />
      <div className={`flex-1 min-h-full flex flex-col transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-60'}`}>
        <div className="flex-1">
          <Router />
        </div>
        <Footer />
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter basename="/">
      <SidebarProvider>
        <MainContent />
      </SidebarProvider>
    </BrowserRouter>
  </React.StrictMode>
)

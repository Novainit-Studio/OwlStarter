import './assets/main.css'
import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import Router from './router'
import { HashRouter } from 'react-router-dom'
import SideBar from './components/SideBar'
import Footer from './components/Footer'
import TitleBar from './components/TitleBar'
import { SidebarProvider, useSidebar } from './context/SidebarContext'

const MainContent = () => {
  const { collapsed } = useSidebar();
  const [shutdownInfo, setShutdownInfo] = useState<{ status: string; message?: string; remaining?: number } | null>(null)

  useEffect(() => {
    const unsubscribe = window.api.onShutdownEvent((payload) => {
      setShutdownInfo(payload)
    })
    return () => unsubscribe()
  }, [])
  return (
    <div className="app-shell flex h-screen">
      <TitleBar />
      <SideBar />
      <div className={`flex-1 min-h-full flex flex-col transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-64'}`}>
        <div className="flex-1 overflow-auto scrollbar-theme">
          <Router />
        </div>
        <Footer />
      </div>
      {shutdownInfo && (
        <div className="shutdown-overlay">
          <div className="shutdown-card">
            <div className="shutdown-title">關閉中</div>
            <div className="shutdown-message">{shutdownInfo.message ?? '正在關閉...'}</div>
            {typeof shutdownInfo.remaining === 'number' && (
              <div className="shutdown-sub">剩餘伺服器：{shutdownInfo.remaining}</div>
            )}
            <div className="shutdown-status">{shutdownInfo.status}</div>
          </div>
        </div>
      )}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <HashRouter>
      <SidebarProvider>
        <MainContent />
      </SidebarProvider>
    </HashRouter>
  </React.StrictMode>
)

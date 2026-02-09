import { useState, useEffect } from 'react'
import {
  Server, Home, ChevronLeft, ChevronRight, ArrowLeft,
  Settings, Database, Users, FileText, Package, Globe, Play,
  Square, RotateCcw, HardDrive, Cpu, Activity, Sparkles, Download
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useSidebar } from '../context/SidebarContext'

import type { MenuItem } from '../types/Sidebar'

const Sidebar = () => {
  const { collapsed, setCollapsed } = useSidebar()
  const [activeItem, setActiveItem] = useState('dashboard')
  const [currentLevel, setCurrentLevel] = useState('root')
  const [breadcrumb, setBreadcrumb] = useState<{ level: string; label: string }[]>([])
  const location = useLocation()

  const rootMenuItems: MenuItem[] = [
    { id: 'dashboard', icon: Home, label: '儀表板', page: '/' },
    { id: 'servers', icon: Server, label: '我的伺服器', page: '/servers', hasChildren: true },
    { id: 'updates', icon: Download, label: '更新中心', page: '/updates' },
    { id: 'plugins', icon: Package, label: '插件管理', page: '/plugins' },
    { id: 'backups', icon: Database, label: '備份管理', page: '/backups' },
    { id: 'users', icon: Users, label: '玩家管理', page: '/users' },
    { id: 'logs', icon: FileText, label: '日誌檢視', page: '/logs' },
    { id: 'settings', icon: Settings, label: '設定', page: '/settings' }
  ]

  const specialRouteActiveMap: Record<string, string> = {
    '/create/server': 'servers'
  }

  const serverMenuItems: MenuItem[] = [
    { id: 'server-overview', icon: Activity, label: '伺服器概覽', page: '/servers/overview' },
    { id: 'server-console', icon: FileText, label: '控制台', page: '/servers/console' },
    { id: 'server-files', icon: HardDrive, label: '檔案管理', page: '/servers/files' },
    { id: 'server-performance', icon: Cpu, label: '效能監控', page: '/servers/performance' },
    { id: 'server-worlds', icon: Globe, label: '世界管理', page: '/servers/worlds' },
    { id: 'server-control', icon: Play, label: '伺服器控制', page: '/servers/control', hasChildren: true }
  ]

  const serverControlItems: MenuItem[] = [
    { id: 'control-start', icon: Play, label: '啟動伺服器', page: '/servers/control/start' },
    { id: 'control-stop', icon: Square, label: '停止伺服器', page: '/servers/control/stop' },
    { id: 'control-restart', icon: RotateCcw, label: '重新啟動', page: '/servers/control/restart' },
    { id: 'control-backup', icon: Database, label: '立即備份', page: '/servers/control/backup' }
  ]

  const getCurrentMenuItems = () => {
    switch (currentLevel) {
      case 'servers': return serverMenuItems
      case 'server-control': return serverControlItems
      default: return rootMenuItems
    }
  }

  const getMenuTitle = () => {
    switch (currentLevel) {
      case 'servers': return '伺服器管理'
      case 'server-control': return '伺服器控制'
      default: return 'OwlStarter'
    }
  }

  const handleMenuClick = (item: any) => {
    setActiveItem(item.id)

    if (item.hasChildren) {
      setBreadcrumb(prev => [...prev, { level: currentLevel, label: getMenuTitle() }])
      setCurrentLevel(item.id)
    }
  }

  const goBack = () => {
    if (breadcrumb.length > 0) {
      const previousLevel = breadcrumb[breadcrumb.length - 1]
      setCurrentLevel(previousLevel.level)
      setBreadcrumb(breadcrumb.slice(0, -1))
    }
  }

  useEffect(() => {
    const path = location.pathname

    if (path.startsWith('/servers/control/')) {
      setCurrentLevel('server-control')
      setBreadcrumb([
        { level: 'root', label: 'OwlStarter' },
        { level: 'servers', label: '伺服器管理' }
      ])
    } else if (path.startsWith('/servers')) {
      setCurrentLevel('servers')
      setBreadcrumb([{ level: 'root', label: 'OwlStarter' }])
    } else {
      setCurrentLevel('root')
      setBreadcrumb([])
    }

    const currentItems = getCurrentMenuItems()
    const activeMenuItem = currentItems.find(item => item.page === path)
    if (activeMenuItem) {
      setActiveItem(activeMenuItem.id)
    } else if (specialRouteActiveMap[path]) {
      setActiveItem(specialRouteActiveMap[path])
    }
  }, [location.pathname])

  const currentMenuItems = getCurrentMenuItems()
  const menuTitle = getMenuTitle()

  return (
    <div className={`fixed h-full sidebar-shell transition-all duration-300 ease-in-out ${collapsed ? 'w-16' : 'w-64'} flex flex-col z-50`}>
      <div className="flex items-center p-4 border-b border-[#1a2740] min-h-[72px]">
        {currentLevel !== 'root' && !collapsed && (
          <Link
            to="/"
            className='cursor-pointer'
          // onClick={() => handleMenuClick(item)}
          >
            <button
              onClick={goBack}
              className="mr-2 p-1 rounded hover:bg-[#1a2740] transition-colors cursor-pointer"
            >
              <ArrowLeft size={16} className="text-slate-300" />
            </button>
          </Link>
        )}
        <div className="flex items-center flex-1 min-w-0">
          <img
            src="/src/assets/logo.png"
            alt="Logo"
            className={`w-8 h-8 flex-shrink-0 ${collapsed ? "" : "mr-2"}`}
          />
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <h1 className="title-display text-white truncate text-sm">
                {menuTitle}
              </h1>
              <span className="text-[11px] text-slate-400 truncate">Server Launcher</span>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-16 w-7 h-7 rounded-full bg-[#0d1628] border border-[#1f2a44] flex items-center justify-center cursor-pointer hover:bg-[#15203a] transition-colors z-10"
      >
        {collapsed ? (
          <ChevronRight size={14} className="text-slate-300" />
        ) : (
          <ChevronLeft size={14} className="text-slate-300" />
        )}
      </button>

      {!collapsed && (
        <div className="px-4 py-3 border-b border-[#1a2740]">
          <div className="panel-soft p-3 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-400">控制艙</div>
              <div className="chip">
                <Sparkles size={12} />
                READY
              </div>
            </div>
            <div className="text-sm text-slate-200">OwlStarter 指揮台</div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              系統穩定 · 低延遲
            </div>
          </div>
        </div>
      )}

      {!collapsed && breadcrumb.length > 0 && (
        <div className="px-4 py-2 border-b border-[#1a2740]">
          <div className="flex items-center text-xs text-slate-500 overflow-x-auto">
            {breadcrumb.map((crumb, index) => (
              <span key={index} className="flex items-center whitespace-nowrap">
                {crumb.label}
                <ChevronRight size={12} className="mx-1" />
              </span>
            ))}
            <span className="text-slate-200 whitespace-nowrap">{menuTitle}</span>
          </div>
        </div>
      )}

      <div className="flex flex-col py-3 gap-2 flex-1 overflow-y-auto scrollbar-theme">
        {currentMenuItems.map((item) => (
          <Link
            to={item.page}
            key={item.id}
            onClick={() => handleMenuClick(item)}
            className={`
              flex items-center cursor-pointer transition-all duration-200 group rounded-xl
              ${collapsed ? 'px-0 py-3 justify-center mx-2' : 'px-3 py-3 mx-3'}
              ${activeItem === item.id
                ? 'sidebar-active text-white'
                : 'text-slate-400 hover:bg-[#18233b] hover:text-white'}
            `}
          >
            <div className={`flex items-center ${collapsed ? 'justify-center' : ''} flex-1 min-w-0 gap-3`}>
              {!collapsed && (
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                  activeItem === item.id
                    ? 'bg-teal-400/20 border-teal-300/40'
                    : 'bg-[#0f1a2f] border-[#1a2740] group-hover:border-teal-300/40'
                }`}>
                  <item.icon
                    size={18}
                    className={`${activeItem === item.id ? 'text-teal-200' : 'text-slate-400 group-hover:text-white'}`}
                  />
                </div>
              )}
              <item.icon
                size={18}
                className={`
                  flex-shrink-0
                  ${collapsed ? '' : 'hidden'} 
                  ${activeItem === item.id ? 'text-white' : 'text-slate-400 group-hover:text-white'}
                `}
              />
              {!collapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="text-sm whitespace-nowrap truncate flex-1">
                    {item.label}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {item.hasChildren ? '進入管理模組' : '快速啟動'}
                  </span>
                </div>
              )}
            </div>
            {!collapsed && item.hasChildren && (
              <ChevronRight
                size={14}
                className={`
                  flex-shrink-0 ml-2
                  ${activeItem === item.id ? 'text-white' : 'text-slate-400 group-hover:text-white'}
                `}
              />
            )}
          </Link>
        ))}
      </div>

      {/* <div className="border-t border-[#2b2b2b]">
        <button
          className={`
            w-full p-4 flex items-center transition-colors duration-200 
            ${collapsed ? 'justify-center' : ''} 
            text-gray-400 hover:bg-[#2b2b2b] hover:text-white
          `}
        >
          <LogOut size={18} className={`${collapsed ? '' : 'mr-3'}`} />
          {!collapsed && <span className="text-sm">登出</span>}
        </button>
      </div> */}
    </div>
  )
}

export default Sidebar

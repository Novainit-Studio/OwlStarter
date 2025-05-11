import { useState } from 'react'
import { Server, Home, LogOut, ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSidebar } from '../context/SidebarContext'

const Sidebar = () => {
  const { collapsed, setCollapsed } = useSidebar()
  const [activeItem, setActiveItem] = useState('dashboard')

  // 菜單項目
  const menuItems = [
    { id: 'dashboard', icon: Home, label: '儀表板', page: '/' },
    { id: 'status', icon: Server, label: '我的伺服器器', page: '/servers' }
    // { id: 'plugins', icon: Package, label: '插件管理' },
    // { id: 'worlds', icon: Globe, label: '世界管理' },
    // { id: 'backups', icon: Database, label: '備份管理' },
    // { id: 'users', icon: Users, label: '玩家管理' },
    // { id: 'logs', icon: FileText, label: '日誌檢視' },
    // { id: 'settings', icon: Settings, label: '設定' }
  ]

  return (
    <div
      className={`fixed h-full bg-[#1f1f1f] border-r border-[#2b2b2b] transition-all duration-300 ease-in-out ${collapsed ? 'w-16' : 'w-60'} flex flex-col`}
    >
      {/* 頂部標題 */}
      <div className="flex items-center p-4 border-b border-[#2b2b2b]">
        <img src="/src/assets/logo.png" alt="Logo" className="w-14 pr-1" />
        {!collapsed && <h1 className="font-bold text-white truncate">OwlStarter</h1>}
      </div>

      {/* 收合按鈕 */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-4 w-6 h-6 rounded-full bg-[#1f1f1f] border border-[#2b2b2b] flex items-center justify-center cursor-pointer"
      >
        {collapsed ? (
          <ChevronRight size={14} className="text-gray-300" />
        ) : (
          <ChevronLeft size={14} className="text-gray-300" />
        )}
      </button>

      {/* 菜單項目 */}
      <div className="flex flex-col py-4 gap-1 flex-1 overflow-y-auto">
        {menuItems.map((item) => (
          <Link
            to={item.page}
            key={item.id}
            onClick={() => setActiveItem(item.id)}
            className={`
              flex items-center cursor-pointer transition-colors duration-200
              ${collapsed ? 'px-0 py-3 justify-center' : 'px-4 py-3 mx-2 rounded'}
              ${
                activeItem === item.id
                  ? 'bg-[#2b2b2b] border-l-4 border-blue-500 text-white'
                  : 'border-l-4 border-transparent text-gray-400 hover:bg-[#2b2b2b] hover:bg-opacity-50'
              }
            `}
          >
            <item.icon
              size={20}
              className={`
                ${collapsed ? '' : 'mr-3'} 
                ${activeItem === item.id ? 'text-blue-500' : 'text-gray-400'}
              `}
            />
            {!collapsed && <span className="text-sm whitespace-nowrap">{item.label}</span>}
          </Link>
        ))}
      </div>

      {/* 底部登出按鈕 */}
      <div
        className={`p-4 border-t border-[#2b2b2b] flex items-center ${collapsed ? 'justify-center' : ''} cursor-pointer hover:bg-[#2b2b2b] hover:bg-opacity-50 transition-colors duration-200`}
      >
        <LogOut size={20} className={`text-gray-400 ${collapsed ? '' : 'mr-3'}`} />
        {!collapsed && <span className="text-sm text-gray-400">登出</span>}
      </div>
    </div>
  )
}

export default Sidebar

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  // ArrowRight,
  Package,
  Server,
  Plus,
  LayoutGrid,
  List
} from 'lucide-react'

function Servers() {
  const [servers, setServers] = useState([
    {
      id: 1,
      name: 'Survival Server',
      type: 'paper',
      version: '1.20.4',
      status: 'running',
      players: 5,
      maxPlayers: 20,
      port: 25565,
      uptime: 120
    },
    {
      id: 2,
      name: 'Creative Server',
      type: 'vanilla',
      version: '1.20.4',
      status: 'stopped',
      players: 0,
      maxPlayers: 10,
      port: 25566,
      uptime: 0
    }
  ])

  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'

  const containerVariants = {
    grid: {
      transition: { duration: 0.4 }
    },
    list: {
      transition: { duration: 0.4 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.3 }
    },
    exit: { 
      opacity: 0,
      scale: 0.8,
      transition: { duration: 0.3 }
    }
  }

  // 啟動伺服器
  const startServer = (serverId) => {
    setServers(servers.map(server => 
      server.id === serverId 
        ? { ...server, status: 'running', uptime: 0 }
        : server
    ))
  }

  // 停止伺服器
  const stopServer = (serverId) => {
    setServers(servers.map(server => 
      server.id === serverId 
        ? { ...server, status: 'stopped', players: 0 }
        : server
    ))
  }

  const ServerCard = ({ server }) => (
    <motion.div
      layout
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="bg-[#1a1a1a] rounded-xl p-5 shadow-md border border-[#141414]"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-xl font-bold mb-1">{server.name}</h2>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Package size={16} />
            <span>{server.type} {server.version}</span>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm ${
          server.status === 'running' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
        }`}>
          {server.status === 'running' ? '運行中' : '已停止'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-[#141414] p-3 rounded-lg">
          <div className="text-sm text-gray-400 mb-1">在線玩家</div>
          <div className="text-xl font-bold">
            {server.players}/{server.maxPlayers}
          </div>
        </div>
        <div className="bg-[#141414] p-3 rounded-lg">
          <div className="text-sm text-gray-400 mb-1">端口</div>
          <div className="text-xl font-bold">{server.port}</div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => server.status === 'running' ? stopServer(server.id) : startServer(server.id)}
          className={`flex-1 py-2 px-4 rounded-lg border-none ${
            server.status === 'running'
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-green-500 hover:bg-green-600'
          } text-white cursor-pointer transition-colors duration-200`}
        >
          {server.status === 'running' ? '停止' : '啟動'}
        </button>
        <button className="py-2 px-4 rounded-lg border-none bg-[#2a2a2a] hover:bg-[#303030] text-white cursor-pointer transition-colors duration-200">
          管理
        </button>
      </div>
    </motion.div>
  )

  const ServerListItem = ({ server }) => (
    <motion.div
      layout
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="bg-[#1a1a1a] rounded-lg p-4 shadow-md border border-[#141414] flex items-center justify-between"
    >
      <div className="flex items-center gap-4">
        <Server size={24} className={server.status === 'running' ? 'text-green-500' : 'text-red-500'} />
        <div>
          <h2 className="text-lg font-bold">{server.name}</h2>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Package size={14} />
            <span>{server.type} {server.version}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-gray-400">
          {server.players}/{server.maxPlayers} 玩家
        </div>
        <div className="text-gray-400">
          端口: {server.port}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => server.status === 'running' ? stopServer(server.id) : startServer(server.id)}
            className={`py-2 px-4 rounded-lg border-none ${
              server.status === 'running'
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-green-500 hover:bg-green-600'
            } text-white cursor-pointer transition-colors duration-200`}
          >
            {server.status === 'running' ? '停止' : '啟動'}
          </button>
          <button className="py-2 px-4 rounded-lg border-none bg-[#2a2a2a] hover:bg-[#303030] text-white cursor-pointer transition-colors duration-200">
            管理
          </button>
        </div>
      </div>
    </motion.div>
  )

  return (
    <div className="h-full bg-[#1E1E1E] text-gray-100 p-6 font-minecraft overflow-auto">
      {/* 頂部標題 */}
      <header className="flex justify-between items-center mb-6 bg-[#141414] p-4 rounded-lg border-2 border-[#2A2A2A]">
        <div className="flex items-center">
          <Server className="text-green-500 mr-3" size={28} />
          <h1 className="text-2xl font-bold">伺服器列表</h1>
        </div>
        <div className="flex gap-3">
          <div className="bg-[#1a1a1a] rounded-lg flex">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-l-lg ${viewMode === 'grid' ? 'bg-[#2a2a2a]' : ''}`}
            >
              <LayoutGrid size={20} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-r-lg ${viewMode === 'list' ? 'bg-[#2a2a2a]' : ''}`}
            >
              <List size={20} />
            </button>
          </div>
          <button className="bg-green-600 hover:bg-green-700 border-none px-4 py-2 rounded-lg cursor-pointer transition-colors duration-200 flex items-center justify-center">
            <Plus className="text-gray-100 mr-2" size={20} />
            <span>新增伺服器</span>
          </button>
        </div>
      </header>

      {/* 伺服器列表 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={viewMode}
          variants={containerVariants}
          initial={viewMode}
          animate={viewMode}
          className={viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            : "flex flex-col gap-4"
          }
        >
          {servers.map(server => (
            viewMode === 'grid' 
              ? <ServerCard key={server.id} server={server} />
              : <ServerListItem key={server.id} server={server} />
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default Servers

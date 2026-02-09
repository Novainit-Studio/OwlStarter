import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
    const navigate = useNavigate()
  const [servers, setServers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const api = window.api as any
  const ipc = (window as any).electron?.ipcRenderer

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

  useEffect(() => {
    const loadServers = async () => {
      setLoading(true)
      setLoadError('')
      try {
        const data = await window.api.listServers()
        setServers(
          data.map((server) => ({
            ...server,
            players: 0
          }))
        )
      } catch (error) {
        setLoadError('無法取得伺服器列表。')
      } finally {
        setLoading(false)
      }
    }

    loadServers()
  }, [])

  // 啟動伺服器
  const startServer = async (serverId) => {
    try {
      if (api?.startServer) {
        await api.startServer(serverId)
      } else if (ipc) {
        await ipc.invoke('servers:start', { serverId })
      } else {
        throw new Error('API 尚未就緒')
      }
      // 重新載入伺服器狀態
      const data = await window.api.listServers()
      setServers(data)
    } catch (error) {
      alert('啟動失敗: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  // 停止伺服器
  const stopServer = async (serverId) => {
    try {
      if (api?.stopServer) {
        await api.stopServer(serverId)
      } else if (ipc) {
        await ipc.invoke('servers:stop', { serverId })
      } else {
        throw new Error('API 尚未就緒')
      }
      const data = await window.api.listServers()
      setServers(data)
    } catch (error) {
      alert('停止失敗: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const statusConfig = useMemo(
    () => ({
      running: { label: '運行中', style: 'status-pill status-running' },
      stopped: { label: '已停止', style: 'status-pill status-stopped' },
      creating: { label: '建立中', style: 'status-pill status-creating' },
      error: { label: '錯誤', style: 'status-pill status-error' },
      ready: { label: '已停止', style: 'status-pill status-stopped' }
    }),
    []
  )

  const ServerCard = ({ server }) => (
    <motion.div
      layout
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="panel p-5 flex flex-col gap-4"
    >
      {server.jarSource && (
        <div className="text-xs text-slate-400">
          JAR 來源: {server.jarSource}
        </div>
      )}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-xl title-display mb-1">{server.name}</h2>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Package size={16} />
            <span>{server.variant} {server.version}</span>
          </div>
        </div>
        <div className={`${statusConfig[server.status]?.style ?? statusConfig.stopped.style}`}>
          {statusConfig[server.status]?.label ?? statusConfig.stopped.label}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="panel-soft p-3">
          <div className="text-sm text-slate-400 mb-1">在線玩家</div>
          <div className="text-xl title-display">
            {server.players}/{server.maxPlayers}
          </div>
        </div>
        <div className="panel-soft p-3">
          <div className="text-sm text-slate-400 mb-1">端口</div>
          <div className="text-xl title-display">{server.port}</div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => server.status === 'running' ? stopServer(server.id) : startServer(server.id)}
          disabled={server.status === 'creating'}
          className={`flex-1 py-2 px-4 rounded-lg border-none ${
            server.status === 'running'
              ? 'bg-rose-500 hover:bg-rose-600'
              : 'bg-emerald-500 hover:bg-emerald-600'
          } text-slate-950 font-semibold cursor-pointer transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed`}
        >
          {server.status === 'running' ? '停止' : '啟動'}
        </button>
        <button
          className="py-2 px-4 rounded-lg border-none bg-[#132036] hover:bg-[#1a2a44] text-white cursor-pointer transition-colors duration-200"
          onClick={() => navigate(`/server/manage/${server.id}`)}
        >
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
      className="panel-soft p-4 flex items-center justify-between"
    >
      <div className="flex items-center gap-4">
        <Server size={24} className={server.status === 'running' ? 'text-teal-200' : 'text-rose-300'} />
        <div>
          <h2 className="text-lg title-display">{server.name}</h2>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Package size={14} />
            <span>{server.variant} {server.version}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-slate-400">
          {server.players}/{server.maxPlayers} 玩家
        </div>
        <div className="text-slate-400">
          端口: {server.port}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => server.status === 'running' ? stopServer(server.id) : startServer(server.id)}
            className={`py-2 px-4 rounded-lg border-none ${
              server.status === 'running'
                ? 'bg-rose-500 hover:bg-rose-600'
                : 'bg-emerald-500 hover:bg-emerald-600'
            } text-slate-950 font-semibold cursor-pointer transition-colors duration-200`}
          >
            {server.status === 'running' ? '停止' : '啟動'}
          </button>
          <button
            className="py-2 px-4 rounded-lg border-none bg-[#132036] hover:bg-[#1a2a44] text-white cursor-pointer transition-colors duration-200"
            onClick={() => navigate(`/server/manage/${server.id}`)}
          >
            管理
          </button>
        </div>
      </div>
    </motion.div>
  )

  return (
    <div className="page-shell px-6 py-8 overflow-auto scrollbar-theme">
      {/* 頂部標題 */}
      <header className="panel panel-glow flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6 p-5">
        <div className="flex items-center gap-3">
          <Server className="text-teal-200" size={28} />
          <div>
            <h1 className="title-display text-2xl">伺服器列表</h1>
            <p className="text-sm text-slate-400">像遊戲啟動器一樣快速切換伺服器狀態</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="panel-soft rounded-xl flex">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-l-xl ${viewMode === 'grid' ? 'bg-[#15213a]' : ''}`}
            >
              <LayoutGrid size={20} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-r-xl ${viewMode === 'list' ? 'bg-[#15213a]' : ''}`}
            >
              <List size={20} />
            </button>
          </div>
          <button
            className="btn-primary inline-flex items-center gap-2"
            onClick={() => navigate('/create/server')}
          >
            <Plus className="text-slate-950" size={18} />
            <span>新增伺服器</span>
          </button>
        </div>
      </header>

      {/* 伺服器列表 */}
      {loadError && (
        <div className="mb-4 panel-soft text-rose-200 text-sm rounded-lg p-3 border border-rose-500/30">
          {loadError}
        </div>
      )}
      {loading && (
        <div className="mb-4 panel-soft text-slate-300 text-sm rounded-lg p-3">
          正在載入伺服器清單...
        </div>
      )}
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

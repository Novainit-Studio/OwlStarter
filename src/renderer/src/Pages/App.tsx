import { useState, useEffect, useRef } from 'react'
import {
  ArrowRight,
  Cpu,
  HardDrive,
  MemoryStick,
  Server,
  Settings,
  Info,
  Package,
  Activity,
  Users
} from 'lucide-react'

function getOs() {
  window.os.ipcRenderer
    .getSystemInfo()
    .then((info) => {
      console.log('System Info:', info)
    })
    .catch((error) => {
      console.error('Error fetching system info:', error)
    })
}
getOs()

function App() {
  // 系統資源狀態
  const [systemInfo, setSystemInfo] = useState({
    cpu: {
      usage: 0,
      model: '獲取中...',
      cores: 0
    },
    memory: {
      total: 0,
      used: 0,
      free: 0
    },
    disk: {
      total: 0,
      used: 0,
      free: 0
    }
  })

  // 顯示動畫的狀態
  const [animatedInfo, setAnimatedInfo] = useState({
    cpu: { usage: 0 },
    memory: { used: 0, total: 0 },
    disk: { used: 0, total: 0 }
  })

  // 版本信息
  const [versions, setVersions] = useState({
    app: '1.0.0',
    electron: '未知',
    node: '未知',
    os: '未知',
    minecraft: {
      vanilla: '1.20.4',
      paper: '1.20.4-435',
      spigot: '1.20.4'
    }
  })

  // 伺服器狀態
  const [serverStatus, setServerStatus] = useState({
    running: false,
    uptime: 0,
    players: 0,
    maxPlayers: 20
  })

  // 追蹤動畫幀
  const animationRef = useRef<number | null>(null)

  // 動畫函數 - 平滑過渡到新數據
  const animateValues = () => {
    const animationSpeed = 0.1

    // CPU 動畫
    if (Math.abs(animatedInfo.cpu.usage - systemInfo.cpu.usage) > 0.1) {
      setAnimatedInfo((prev) => ({
        ...prev,
        cpu: {
          ...prev.cpu,
          usage: prev.cpu.usage + (systemInfo.cpu.usage - prev.cpu.usage) * animationSpeed
        }
      }))
    }

    // 記憶體動畫
    if (Math.abs(animatedInfo.memory.used - systemInfo.memory.used) > 1) {
      setAnimatedInfo((prev) => ({
        ...prev,
        memory: {
          ...prev.memory,
          used: prev.memory.used + (systemInfo.memory.used - prev.memory.used) * animationSpeed,
          total: systemInfo.memory.total
        }
      }))
    }

    // 硬碟動畫
    if (Math.abs(animatedInfo.disk.used - systemInfo.disk.used) > 1) {
      setAnimatedInfo((prev) => ({
        ...prev,
        disk: {
          ...prev.disk,
          used: prev.disk.used + (systemInfo.disk.used - prev.disk.used) * animationSpeed,
          total: systemInfo.disk.total
        }
      }))
    }

    // 繼續下一幀動畫
    animationRef.current = requestAnimationFrame(animateValues)
  }

  // 獲取系統信息
  useEffect(() => {
    const fetchSystemInfo = async () => {
      try {
        const resourceData = await window.os.ipcRenderer.getResourceUsage()

        setSystemInfo((prev) => ({
          ...prev,
          cpu: resourceData.cpu,
          memory: {
            total: Math.floor(resourceData.memory.total / (1024 * 1024)), // Convert to MB
            used: Math.floor(resourceData.memory.used / (1024 * 1024)),
            free: Math.floor(resourceData.memory.free / (1024 * 1024))
          },
          disk: prev.disk // Keep existing disk data as it doesn't change frequently
        }))
      } catch (error) {
        console.error('Error fetching system resources:', error)
      }
    }

    // 初始化獲取系統信息
    fetchSystemInfo()

    // 初始化動畫值與真實值同步
    setAnimatedInfo({
      cpu: { usage: systemInfo.cpu.usage },
      memory: { used: systemInfo.memory.used, total: systemInfo.memory.total },
      disk: { used: systemInfo.disk.used, total: systemInfo.disk.total }
    })

    // 啟動動畫
    animationRef.current = requestAnimationFrame(animateValues)

    // 每兩秒更新系統資源使用情況
    const intervalId = setInterval(fetchSystemInfo, 2000)

    // 模擬伺服器狀態更新
    const serverIntervalId = setInterval(() => {
      if (serverStatus.running) {
        setServerStatus((prev) => ({
          ...prev,
          uptime: prev.uptime + 1,
          players: Math.min(Math.floor(Math.random() * 10), 20)
        }))
      }
    }, 60000)

    // 清理函數
    return () => {
      clearInterval(intervalId)
      clearInterval(serverIntervalId)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [serverStatus.running])

  // 計算百分比
  const getPercentage = (used, total) => {
    return Math.round((used / total) * 100)
  }

  // 格式化 MB 為 GB
  const formatGB = (mb) => {
    return (mb / 1024).toFixed(2)
  }

  // 啟動伺服器
  const startServer = () => {
    setServerStatus({
      ...serverStatus,
      running: true,
      uptime: 0
    })
  }

  // 停止伺服器
  const stopServer = () => {
    setServerStatus({
      ...serverStatus,
      running: false,
      players: 0
    })
  }

  return (
    <div className="h-full bg-[#1f1f1f] text-gray-100 p-6 font-sans overflow-auto">
      {/* 頂部標題 */}
      <header className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Server className="text-green-500 mr-3" size={28} />
          <h1 className="text-2xl font-bold">儀表盤</h1>
        </div>
        <div className="flex gap-3">
          <button className="bg-[#1a1a1a] border-none p-2 rounded-lg cursor-pointer transition-colors duration-200 flex items-center justify-center">
            <Settings className="text-gray-100" size={20} />
          </button>
          <button className="bg-[#1a1a1a] border-none p-2 rounded-lg cursor-pointer transition-colors duration-200 flex items-center justify-center">
            <Info className="text-gray-100" size={20} />
          </button>
        </div>
      </header>

      {/* 儀表盤部分 - 主要資源顯示 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* 伺服器狀態卡片 */}
        <div className="bg-[#1a1a1a] rounded-xl p-5 shadow-md border border-[#141414] flex flex-col justify-between">
          <div className="flex items-center mb-2">
            <Server className="text-#1f1f1f mr-2" size={20} />
            <h3 className="text-base font-medium">伺服器狀態</h3>
          </div>

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center">
              <div
                className={`w-3 h-3 rounded-full mr-2 ${serverStatus.running ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}
              ></div>
              <span>{serverStatus.running ? '運行中' : '已停止'}</span>
            </div>
            <div>
              <button
                onClick={startServer}
                disabled={serverStatus.running}
                className={`py-1.5 px-3 rounded-md mr-2 border-none ${serverStatus.running ? 'bg-[#1a1a1a] cursor-not-allowed opacity-60' : 'bg-green-500 cursor-pointer'} text-gray-100`}
              >
                啟動
              </button>
              <button
                onClick={stopServer}
                disabled={!serverStatus.running}
                className={`py-1.5 px-3 rounded-md border-none ${!serverStatus.running ? 'bg-[#1a1a1a] cursor-not-allowed opacity-60' : 'bg-red-500 cursor-pointer'} text-gray-100`}
              >
                停止
              </button>
            </div>
          </div>
        </div>

        {/* 玩家數量卡片 */}
        <div className="bg-[#1a1a1a] rounded-xl p-5 shadow-md border border-[#141414] flex flex-col justify-between">
          <div className="flex items-center mb-2">
            <Users className="text-blue-500 mr-2" size={20} />
            <h3 className="text-base font-medium">玩家數量</h3>
          </div>

          <div className="mt-3">
            <div className="text-3xl font-bold">
              {serverStatus.players}{' '}
              <span className="text-base text-gray-400">/ {serverStatus.maxPlayers}</span>
            </div>
            <div className="text-sm text-gray-400">線上玩家</div>
          </div>
        </div>

        {/* 上線時間卡片 */}
        <div className="bg-[#1a1a1a] rounded-xl p-5 shadow-md border border-[#141414] flex flex-col justify-between">
          <div className="flex items-center mb-2">
            <Activity className="text-green-500 mr-2" size={20} />
            <h3 className="text-base font-medium">上線時間</h3>
          </div>

          <div className="mt-3">
            <div className="text-3xl font-bold">{serverStatus.uptime}</div>
            <div className="text-sm text-gray-400">分鐘</div>
          </div>
        </div>

        {/* Minecraft 版本卡片 */}
        <div className="bg-[#1a1a1a] rounded-xl p-5 shadow-md border border-[#141414] flex flex-col justify-between">
          <div className="flex items-center mb-2">
            <Package className="text-gray-600 mr-2" size={20} />
            <h3 className="text-base font-medium">服務器版本</h3>
          </div>

          <div className="mt-3">
            <div className="text-3xl font-bold">{versions.minecraft.paper}</div>
            <div className="text-sm text-gray-400">Paper</div>
          </div>
        </div>
      </div>

      {/* 系統資源監控 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* CPU 使用率卡片 */}
        <div className="bg-[#1a1a1a] rounded-xl p-5 shadow-md border border-[#141414]">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <Cpu className="text-blue-500 mr-2" size={20} />
              <h3 className="text-base font-medium">CPU 使用率</h3>
            </div>
            <span
              className={`text-xl font-bold ${Math.round(animatedInfo.cpu.usage) > 80 ? 'text-red-500' : 'text-gray-100'}`}
            >
              {Math.round(animatedInfo.cpu.usage)}%
            </span>
          </div>
          <div className="w-full h-2 bg-blue-900/20 rounded overflow-hidden mb-2">
            <div
              className="h-full bg-blue-500 rounded transition-all duration-300 ease-out"
              style={{ width: `${animatedInfo.cpu.usage}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-400">
            {systemInfo.cpu.model} ({systemInfo.cpu.cores} 核心)
          </div>
        </div>

        {/* 記憶體使用率卡片 */}
        <div className="bg-[#1a1a1a] rounded-xl p-5 shadow-md border border-[#141414]">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <MemoryStick className="text-purple-500 mr-2" size={20} />
              <h3 className="text-base font-medium">記憶體使用率</h3>
            </div>
            <span>
              {formatGB(animatedInfo.memory.used)} GB / {formatGB(systemInfo.memory.total)} GB
            </span>
          </div>
          <div className="w-full h-2 bg-purple-900/20 rounded overflow-hidden mb-2">
            <div
              className="h-full bg-purple-500 rounded transition-all duration-300 ease-out"
              style={{
                width: `${getPercentage(animatedInfo.memory.used, animatedInfo.memory.total)}%`
              }}
            ></div>
          </div>
          <div className="text-xs text-gray-400">可用: {formatGB(systemInfo.memory.free)} GB</div>
        </div>

        {/* 硬碟使用率卡片 */}
        <div className="bg-[#1a1a1a] rounded-xl p-5 shadow-md border border-[#141414]">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <HardDrive className="text-amber-500 mr-2" size={20} />
              <h3 className="text-base font-medium">硬碟使用率</h3>
            </div>
            <span>
              {formatGB(animatedInfo.disk.used)} GB / {formatGB(systemInfo.disk.total)} GB
            </span>
          </div>
          <div className="w-full h-2 bg-amber-900/20 rounded overflow-hidden mb-2">
            <div
              className="h-full bg-amber-500 rounded transition-all duration-300 ease-out"
              style={{
                width: `${getPercentage(animatedInfo.disk.used, animatedInfo.disk.total)}%`
              }}
            ></div>
          </div>
          <div className="text-xs text-gray-400">可用: {formatGB(systemInfo.disk.free)} GB</div>
        </div>
      </div>

      {/* 快速動作與詳細資訊 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 系統資訊 */}
        <div className="bg-[#1a1a1a] rounded-xl p-5 shadow-md border border-[#141414] md:col-span-2">
          <h2 className="text-lg font-semibold mb-4 pb-2 border-b border-[#141414]">系統資訊</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm text-gray-400 mb-2">應用資訊</h3>
              <div className="mb-2 flex justify-between">
                <span className="text-gray-400">應用版本</span>
                <span>{versions.app}</span>
              </div>
              <div className="mb-2 flex justify-between">
                <span className="text-gray-400">Electron</span>
                <span>{versions.electron}</span>
              </div>
              <div className="mb-2 flex justify-between">
                <span className="text-gray-400">Node.js</span>
                <span>{versions.node}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">作業系統</span>
                <span>{versions.os}</span>
              </div>
            </div>

            <div>
              <h3 className="text-sm text-gray-400 mb-2">Minecraft 版本</h3>
              <div className="mb-2 flex justify-between">
                <span className="text-gray-400">Vanilla</span>
                <span>{versions.minecraft.vanilla}</span>
              </div>
              <div className="mb-2 flex justify-between">
                <span className="text-gray-400">Paper</span>
                <span>{versions.minecraft.paper}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Spigot</span>
                <span>{versions.minecraft.spigot}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 快速動作 */}
        <div className="bg-[#1a1a1a] rounded-xl p-5 shadow-md border border-[#141414]">
          <h2 className="text-lg font-semibold mb-4 pb-2 border-b border-[#141414]">快速動作</h2>

          <div className="flex flex-col gap-2">
            <button className="bg-[#1f1f1f] border-none py-3 px-3 rounded-lg text-gray-100 cursor-pointer flex justify-between items-center transition duration-200 text-left hover:bg-gray-700">
              <span>伺服器設定</span>
              <ArrowRight size={18} />
            </button>
            <button className="bg-[#1f1f1f] border-none py-3 px-3 rounded-lg text-gray-100 cursor-pointer flex justify-between items-center transition duration-200 text-left hover:bg-gray-700">
              <span>插件管理</span>
              <ArrowRight size={18} />
            </button>
            <button className="bg-[#1f1f1f] border-none py-3 px-3 rounded-lg text-gray-100 cursor-pointer flex justify-between items-center transition duration-200 text-left hover:bg-gray-700">
              <span>世界設定</span>
              <ArrowRight size={18} />
            </button>
            <button className="bg-[#1f1f1f] border-none py-3 px-3 rounded-lg text-gray-100 cursor-pointer flex justify-between items-center transition duration-200 text-left hover:bg-gray-700">
              <span>備份管理</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* 底部版權 */}
      <footer className="mt-8 text-center text-gray-400 text-sm">
        <p>Novainit Studio @ OwlStater © 2025 - {new Date().getFullYear()}</p>
        <p>
          OwlStater 不隸屬或認可於 Mojang AB、Microsoft 或 Minecraft。
        </p>
      </footer>
    </div>
  )
}

export default App

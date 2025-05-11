import { useState } from 'react'
import { Server, Package, ArrowRight } from 'lucide-react'

function App() {
  const [versions] = useState({
    app: '1.0.0',
    minecraft: {
      vanilla: '1.20.4',
      paper: '1.20.4-435',
      spigot: '1.20.4'
    }
  })

  return (
    <div className="text-gray-100 font-minecraft">
      {/* 頂部橫幅 */}
      <div className="bg-[#141414] p-6 shadow-lg border-b-2 border-[#2A2A2A]">
        <div className="container mx-auto">
          <h1 className="text-4xl font-bold text-center text-green-500">OwlStarter</h1>
          <p className="text-center text-gray-400 mt-2">Minecraft 伺服器架設工具</p>
        </div>
      </div>

      {/* 主要內容區域 */}
      <div className="container mx-auto px-6 py-12">
        {/* 功能卡片網格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 我的伺服器卡片 */}
          <div className="bg-[#1A1A1A] rounded-lg p-6 border-2 border-[#2A2A2A] hover:border-green-500 transition-all duration-300">
            <div className="flex items-center mb-4">
              <Server className="text-green-500 mr-3" size={24} />
              <h2 className="text-xl font-bold">我的伺服器</h2>
            </div>
            <p className="text-gray-400 mb-4">管理您的 Minecraft 伺服器，監控效能和玩家。</p>
            <button className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md flex items-center justify-between transition-colors duration-200">
              <span>進入管理</span>
              <ArrowRight size={18} />
            </button>
          </div>

          {/* 創建新伺服器卡片 */}
          <div className="bg-[#1A1A1A] rounded-lg p-6 border-2 border-[#2A2A2A] hover:border-blue-500 transition-all duration-300">
            <div className="flex items-center mb-4">
              <Package className="text-blue-500 mr-3" size={24} />
              <h2 className="text-xl font-bold">創建新伺服器</h2>
            </div>
            <p className="text-gray-400 mb-4">選擇版本和模組，快速部署新的 Minecraft 伺服器。</p>
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md flex items-center justify-between transition-colors duration-200">
              <span>開始創建</span>
              <ArrowRight size={18} />
            </button>
          </div>

          {/* 版本資訊卡片 */}
          <div className="bg-[#1A1A1A] rounded-lg p-6 border-2 border-[#2A2A2A]">
            <h2 className="text-xl font-bold mb-4">可用版本</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Vanilla</span>
                <span className="text-green-500">{versions.minecraft.vanilla}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Paper</span>
                <span className="text-green-500">{versions.minecraft.paper}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Spigot</span>
                <span className="text-green-500">{versions.minecraft.spigot}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App

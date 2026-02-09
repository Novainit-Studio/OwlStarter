import { useState } from 'react'
import { Server, Package, ArrowRight, Sparkles, Rocket } from 'lucide-react'
import { Link } from 'react-router-dom'

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
    <div className="page-shell px-6 py-10">
      <div className="panel panel-glow p-6 md:p-8 mb-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="chip mb-3">
              <Sparkles size={14} />
              啟動器模式
            </div>
            <h1 className="title-display text-4xl md:text-5xl mb-3">OwlStarter Control Deck</h1>
            <p className="text-slate-300">
              像遊戲啟動器一樣啟動你的 Minecraft 伺服器：快速配置、監控狀態、即時部署。
            </p>
            <div className="flex flex-wrap gap-3 mt-5">
              <Link to="/servers" className="btn-primary inline-flex items-center gap-2">
                <Server size={18} />
                進入伺服器大廳
              </Link>
              <Link to="/create/server" className="btn-accent inline-flex items-center gap-2">
                <Rocket size={18} />
                一鍵建立新世界
              </Link>
            </div>
          </div>
          {/* <div className="panel-soft p-5 md:p-6 min-w-[240px]">
            <div className="text-xs text-slate-400 mb-2">系統狀態</div>
            <div className="title-display text-2xl mb-3 text-teal-200">READY</div>
            <div className="flex flex-col gap-2 text-sm text-slate-300">
              <div className="flex items-center justify-between">
                <span>伺服器座位</span>
                <span className="text-teal-200">12/20</span>
              </div>
              <div className="flex items-center justify-between">
                <span>資源健康度</span>
                <span className="text-sky-200">穩定</span>
              </div>
              <div className="flex items-center justify-between">
                <span>版本快照</span>
                <span className="text-slate-200">{versions.app}</span>
              </div>
            </div>
          </div> */}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="panel p-5 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Server className="text-teal-200" size={24} />
            <h2 className="text-xl title-display">我的伺服器</h2>
          </div>
          <p className="text-slate-300 text-sm">
            進入你的伺服器列表，快速切換狀態、查看玩家與效能。
          </p>
          <Link to="/servers" className="btn-ghost inline-flex items-center justify-between">
            <span>進入管理</span>
            <ArrowRight size={18} />
          </Link>
        </div>

        <div className="panel p-5 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Package className="text-sky-200" size={24} />
            <h2 className="text-xl title-display">創建新伺服器</h2>
          </div>
          <p className="text-slate-300 text-sm">
            選擇核心、版本與世界設定，像選擇遊戲模式一樣快速部署。
          </p>
          <Link to="/create/server" className="btn-ghost inline-flex items-center justify-between">
            <span>開始創建</span>
            <ArrowRight size={18} />
          </Link>
        </div>

        {/* <div className="panel p-5 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Sparkles className="text-amber-200" size={24} />
            <h2 className="text-xl title-display">可用版本</h2>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Vanilla</span>
              <span className="text-teal-200">{versions.minecraft.vanilla}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Paper</span>
              <span className="text-teal-200">{versions.minecraft.paper}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Spigot</span>
              <span className="text-teal-200">{versions.minecraft.spigot}</span>
            </div>
          </div>
          <div className="chip w-fit">
            <ArrowRight size={12} />
            已同步最新核心
          </div>
        </div> */}
      </div>
    </div>
  )
}

export default App

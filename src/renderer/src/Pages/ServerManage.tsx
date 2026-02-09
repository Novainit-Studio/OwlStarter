import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Terminal, Server, Settings, Users, Link2, Activity } from 'lucide-react'

function ServerManage({ serverId }) {
  const navigate = useNavigate()
  const [server, setServer] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const api = window.api as any
  const ipc = (window as any).electron?.ipcRenderer
  const [terminalOutput, setTerminalOutput] = useState('')
  const [command, setCommand] = useState('')
  const [autoScroll, setAutoScroll] = useState(true)
  const terminalRef = useRef<HTMLDivElement | null>(null)
  const [players, setPlayers] = useState([])
  const [playerActionResult, setPlayerActionResult] = useState('')
  const [configContent, setConfigContent] = useState('')
  const [configDirty, setConfigDirty] = useState(false)
  const [savingConfig, setSavingConfig] = useState(false)
  const [networkAddresses, setNetworkAddresses] = useState<string[]>([])
  const [resourceUsage, setResourceUsage] = useState<any>(null)
  const [serverUsage, setServerUsage] = useState<any>(null)

  const statusLabel = useMemo(() => {
    if (!server) return '未知'
    if (server.status === 'running') return '運行中'
    if (server.status === 'creating') return '建立中'
    if (server.status === 'error') return '錯誤'
    if (server.status === 'ready') return '已停止'
    return server.status
  }, [server])

  useEffect(() => {
    const loadServer = async () => {
      setLoading(true)
      setLoadError('')
      try {
        const data = await (window.api as any).getServer(Number(serverId))
        setServer(data)
      } catch (error) {
        setLoadError('無法取得伺服器資料')
      } finally {
        setLoading(false)
      }
    }
    loadServer()
  }, [serverId])

  useEffect(() => {
    if (serverId) {
      localStorage.setItem('activeServerId', String(serverId))
    }
  }, [serverId])

  useEffect(() => {
    return () => {
      localStorage.removeItem('activeServerId')
    }
  }, [])

  const refreshServer = async () => {
    const data = await (window.api as any).getServer(Number(serverId))
    setServer(data)
  }

  // 終端機輸出
  useEffect(() => {
    let mounted = true
    const fetchTerminal = async () => {
      try {
        const res = await (window.api as any).getServerTerminal(Number(serverId), null)
        if (mounted) {
          setTerminalOutput(res.output)
        }
      } catch (error) {
        console.error('Failed to fetch terminal output:', error)
      }
    }
    fetchTerminal()
    const timer = setInterval(fetchTerminal, 1500)
    return () => {
      mounted = false
      clearInterval(timer)
    }
  }, [serverId])

  useEffect(() => {
    if (!autoScroll) return
    const el = terminalRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [terminalOutput, autoScroll])

  // 發送終端機指令
  const sendCommand = async () => {
    const res = await (window.api as any).getServerTerminal(Number(serverId), command)
    setTerminalOutput(res.output)
    setCommand('')
  }

  // 玩家列表
  useEffect(() => {
    const fetchPlayers = async () => {
      const res = await (window.api as any).getServerPlayers(Number(serverId))
      setPlayers(res.players ?? [])
    }
    fetchPlayers()
  }, [serverId])

  const refreshPlayers = async () => {
    const res = await (window.api as any).getServerPlayers(Number(serverId))
    setPlayers(res.players ?? [])
  }

  // 玩家管理
  const handlePlayerAction = async (action, player) => {
    const res = await (window.api as any).playerAction(Number(serverId), action, player)
    setPlayerActionResult(res.result)
    const updated = await (window.api as any).getServerPlayers(Number(serverId))
    setPlayers(updated.players ?? [])
  }

  const loadConfig = async () => {
    const res = await (window.api as any).getServerConfig(Number(serverId))
    setConfigContent(res.content ?? '')
    setConfigDirty(false)
  }

  useEffect(() => {
    if (!serverId) return
    loadConfig()
  }, [serverId])


  useEffect(() => {
    const loadNetwork = async () => {
      const res = await window.api.getNetworkInfo()
      setNetworkAddresses(res?.addresses ?? [])
    }
    const loadUsage = async () => {
      const usage = await window.os.ipcRenderer.getResourceUsage()
      setResourceUsage(usage)
      if (serverId) {
        const serverRes = await window.api.getServerUsage(Number(serverId))
        setServerUsage(serverRes)
      }
    }
    loadNetwork()
    loadUsage()
    const timer = setInterval(loadUsage, 3000)
    return () => clearInterval(timer)
  }, [])


  const saveConfig = async () => {
    setSavingConfig(true)
    await (window.api as any).updateServerConfig(Number(serverId), configContent)
    setConfigDirty(false)
    setSavingConfig(false)
  }

  const startServer = async () => {
    if (api?.startServer) {
      await api.startServer(Number(serverId))
    } else if (ipc) {
      await ipc.invoke('servers:start', { serverId: Number(serverId) })
    } else {
      throw new Error('API 尚未就緒')
    }
    await refreshServer()
  }

  const stopServer = async () => {
    if (api?.stopServer) {
      await api.stopServer(Number(serverId))
    } else if (ipc) {
      await ipc.invoke('servers:stop', { serverId: Number(serverId) })
    } else {
      throw new Error('API 尚未就緒')
    }
    await refreshServer()
  }

  const forceStopServer = async () => {
    if (api?.killServer) {
      await api.killServer(Number(serverId))
    } else if (ipc) {
      await ipc.invoke('servers:kill', { serverId: Number(serverId) })
    } else {
      throw new Error('API 尚未就緒')
    }
    await refreshServer()
  }

  const restartServer = async () => {
    if (!serverId) return
    await stopServer()
    await startServer()
  }

  const deleteServer = async () => {
    const ok = confirm('確定要刪除伺服器？此操作無法復原。')
    if (!ok) return
    if (api?.deleteServer) {
      await api.deleteServer(Number(serverId))
    } else if (ipc) {
      await ipc.invoke('servers:delete', { serverId: Number(serverId) })
    } else {
      throw new Error('API 尚未就緒')
    }
    navigate('/servers')
  }

  return (
    <div className="page-shell px-6 py-8 min-h-full">
      <div className="panel panel-glow p-5 mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Server className="text-teal-200" />
          <div>
            <h2 className="title-display text-2xl">伺服器控制艙</h2>
            <div className="text-sm text-slate-400">快速管理、監控玩家與終端指令</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn-ghost inline-flex items-center justify-center"
            onClick={() => navigate(`/server/files/${serverId}`)}
          >
            檔案管理
          </button>
          <button
            className="btn-ghost inline-flex items-center justify-center"
            onClick={() => navigate('/servers')}
          >
            返回列表
          </button>
        </div>
      </div>

      {loadError && (
        <div className="mb-4 panel-soft text-rose-200 text-sm rounded-lg p-3 border border-rose-500/30">
          {loadError}
        </div>
      )}
      {loading && (
        <div className="mb-4 panel-soft text-slate-300 text-sm rounded-lg p-3">
          正在載入伺服器資料...
        </div>
      )}

      {server && (
        <div className="mb-6 panel p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xl title-display">{server.name}</div>
              <div className="text-sm text-slate-400">{server.variant} {server.version} · 端口 {server.port}</div>
            </div>
            <div className="text-sm text-slate-300">狀態：{statusLabel}</div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {server.status === 'running' ? (
              <>
                <button
                  className="bg-rose-500 hover:bg-rose-600 text-slate-950 px-4 py-2 rounded-lg font-semibold"
                  onClick={stopServer}
                >
                  關機
                </button>
                <button
                  className="btn-accent"
                  onClick={restartServer}
                >
                  重新開機
                </button>
                <button
                  className="btn-ghost"
                  onClick={forceStopServer}
                >
                  強制關閉
                </button>
              </>
            ) : (
              <button
                className="btn-primary"
                onClick={startServer}
                disabled={server.status === 'creating'}
              >
                開機
              </button>
            )}
            <button
              className="btn-ghost"
              onClick={deleteServer}
            >
              刪除伺服器
            </button>
          </div>
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="panel p-4">
          <div className="mb-3 text-lg title-display flex items-center gap-2">
            <Link2 className="mr-2" />
            連接方式
          </div>
          <div className="space-y-2 text-sm text-slate-300">
            <div className="panel-soft px-3 py-2 flex items-center justify-between">
              <span>本機</span>
              <span className="text-slate-100">127.0.0.1:{server?.port}</span>
            </div>
            {networkAddresses.map((address) => (
              <div key={address} className="panel-soft px-3 py-2 flex items-center justify-between">
                <span>區網</span>
                <span className="text-slate-100">{address}:{server?.port}</span>
              </div>
            ))}
            {networkAddresses.length === 0 && (
              <div className="text-xs text-slate-400">尚未取得區網位址</div>
            )}
          </div>
        </div>
        <div className="panel p-4">
          <div className="mb-3 text-lg title-display flex items-center gap-2">
            <Activity className="mr-2" />
            伺服器使用量
          </div>
          {resourceUsage ? (
            <div className="space-y-4 text-sm text-slate-300">
              <div>
                <div className="flex items-center justify-between">
                  <span>主機 CPU</span>
                  <span>{resourceUsage.cpu?.usage?.toFixed?.(1) ?? resourceUsage.cpu?.usage}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#0b1526] border border-[#1a2740] overflow-hidden mt-2">
                  <div
                    className="h-full bg-gradient-to-r from-sky-400 to-teal-300"
                    style={{ width: `${Math.min(100, resourceUsage.cpu?.usage ?? 0)}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span>主機記憶體</span>
                <span>{Math.round((resourceUsage.memory?.used ?? 0) / (1024 * 1024))} MB / {Math.round((resourceUsage.memory?.total ?? 0) / (1024 * 1024))} MB</span>
              </div>
              {serverUsage?.running ? (
                <div className="panel-soft p-3">
                  <div className="flex items-center justify-between">
                    <span>伺服器 CPU</span>
                    <span>{serverUsage.cpu?.toFixed?.(1) ?? serverUsage.cpu}%</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span>伺服器記憶體</span>
                    <span>{Math.round((serverUsage.memory ?? 0) / (1024 * 1024))} MB ({(serverUsage.memoryPercent ?? 0).toFixed(1)}%)</span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400">伺服器尚未啟動，無法取得使用量</div>
              )}
            </div>
          ) : (
            <div className="text-sm text-slate-400">載入中...</div>
          )}
        </div>
      </div>

      {/* 檔案配置管理 */}
      <div className="mb-6">
        <div className="mb-2 text-lg title-display flex items-center gap-2"><Settings className="mr-2" />檔案配置管理</div>
        <div className="panel p-3">
          <textarea
            className="w-full h-48 bg-[#05070d] text-emerald-200 font-mono text-sm p-3 rounded-lg border border-[#1a2740]"
            value={configContent}
            onChange={(e) => {
              setConfigContent(e.target.value)
              setConfigDirty(true)
            }}
            placeholder="server.properties 內容"
          />
          <div className="flex gap-2 mt-3">
            <button
              className="btn-ghost"
              onClick={loadConfig}
            >
              重新載入
            </button>
            <button
              className="btn-primary disabled:opacity-60"
              onClick={saveConfig}
              disabled={!configDirty || savingConfig}
            >
              儲存設定
            </button>
          </div>
        </div>
      </div>

      {/* 終端機區塊 */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-lg title-display flex items-center gap-2">
            <Terminal className="mr-2" />
            遊戲終端機
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <input
              type="checkbox"
              className="accent-sky-400"
              checked={autoScroll}
              onChange={(event) => setAutoScroll(event.target.checked)}
            />
            自動滾動
          </label>
        </div>
        <div
          ref={terminalRef}
          className="panel p-4 h-48 overflow-y-auto text-emerald-200 font-mono text-sm mb-2 scrollbar-theme"
          style={{ whiteSpace: 'pre-wrap' }}
        >
          {terminalOutput || '尚無輸出'}
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 bg-[#0b1526] text-slate-100 p-2 rounded-lg border border-[#1a2740]"
            value={command}
            onChange={e => setCommand(e.target.value)}
            placeholder="輸入指令..."
          />
          <button
            className="btn-primary"
            onClick={sendCommand}
            disabled={!command}
          >送出</button>
        </div>
      </div>
      {/* 玩家管理區塊 */}
      <div>
        <div className="mb-2 text-lg title-display flex items-center gap-2"><Users className="mr-2" />玩家管理</div>
        <div className="panel p-4 mb-2">
          <div className="flex justify-end mb-3">
            <button
              className="btn-ghost px-3 py-1"
              onClick={refreshPlayers}
            >
              重新整理
            </button>
          </div>
          {players.length === 0 ? (
            <div className="text-slate-400">目前無玩家在線</div>
          ) : (
            <ul className="space-y-2">
              {players.map(player => (
                <li key={player} className="flex items-center justify-between">
                  <span>{player}</span>
                  <div className="flex gap-2">
                    <button className="bg-rose-500 hover:bg-rose-600 text-slate-950 px-3 py-1 rounded-lg font-semibold" onClick={() => handlePlayerAction('kick', player)}>踢出</button>
                    <button className="bg-amber-400 hover:bg-amber-500 text-slate-950 px-3 py-1 rounded-lg font-semibold" onClick={() => handlePlayerAction('ban', player)}>封禁</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {playerActionResult && <div className="text-emerald-300 mt-2">{playerActionResult}</div>}
      </div>
    </div>
  )
}

export default ServerManage

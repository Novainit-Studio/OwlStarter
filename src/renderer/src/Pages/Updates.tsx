import { useEffect, useMemo, useState } from 'react'
import { Download, RefreshCw, Rocket, ShieldCheck, CheckCircle2, AlertTriangle } from 'lucide-react'

type UpdateState = {
  status: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  message?: string
  version?: string
  releaseNotes?: string
  progress?: number
}

const DEFAULT_INTERVAL = 6 * 60 * 60 * 1000

function Updates() {
  const [state, setState] = useState<UpdateState>({ status: 'idle' })
  const [autoCheck, setAutoCheck] = useState(true)
  const [autoDownload, setAutoDownload] = useState(false)
  const [intervalMs, setIntervalMs] = useState(DEFAULT_INTERVAL)
  const [saving, setSaving] = useState(false)

  const isValidStatus = (value: string) => {
    return ['idle', 'checking', 'available', 'not-available', 'downloading', 'downloaded', 'error'].includes(value)
  }

  const hasUpdateApi =
    typeof window.api?.getUpdateState === 'function' &&
    typeof window.api?.checkForUpdates === 'function' &&
    typeof window.api?.downloadUpdate === 'function' &&
    typeof window.api?.installUpdate === 'function' &&
    typeof window.api?.setAutoUpdate === 'function'

  useEffect(() => {
    const load = async () => {
      if (!hasUpdateApi) {
        setState({
          status: 'error',
          message: '更新 API 尚未注入，請重新啟動桌面應用。'
        })
        return
      }
      const saved = window.localStorage.getItem('autoUpdateSettings')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          setAutoCheck(Boolean(parsed.autoCheck))
          setAutoDownload(Boolean(parsed.autoDownload))
          setIntervalMs(Number(parsed.intervalMs) || DEFAULT_INTERVAL)
        } catch {
          // ignore
        }
      }
      const current = await window.api.getUpdateState()
      if (current?.status && isValidStatus(current.status)) {
        setState(current as UpdateState)
      }
    }
    load()

    if (!hasUpdateApi || typeof window.api?.onUpdateEvent !== 'function') {
      return
    }
    const unsubscribe = window.api.onUpdateEvent((payload) => {
      if (payload?.status && isValidStatus(payload.status)) {
        setState(payload as UpdateState)
      }
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!hasUpdateApi) return
    const payload = { autoCheck, autoDownload, intervalMs }
    window.localStorage.setItem('autoUpdateSettings', JSON.stringify(payload))
    void window.api.setAutoUpdate(payload)
  }, [autoCheck, autoDownload, intervalMs])

  const intervalLabel = useMemo(() => {
    const hours = Math.round(intervalMs / (60 * 60 * 1000))
    return `${hours} 小時`
  }, [intervalMs])

  const statusLabel = useMemo(() => {
    switch (state.status) {
      case 'checking':
        return '正在檢查更新...'
      case 'available':
        return `發現新版本 ${state.version ?? ''}`.trim()
      case 'downloading':
        return `正在下載更新 ${state.progress ?? 0}%`
      case 'downloaded':
        return `更新已下載 ${state.version ?? ''}`.trim()
      case 'not-available':
        return '已是最新版本'
      case 'error':
        return '更新錯誤'
      default:
        return '等待中'
    }
  }, [state])

  const handleCheck = async () => {
    if (!hasUpdateApi) return
    setSaving(true)
    try {
      await window.api.checkForUpdates()
    } finally {
      setSaving(false)
    }
  }

  const handleDownload = async () => {
    if (!hasUpdateApi) return
    setSaving(true)
    try {
      await window.api.downloadUpdate()
    } finally {
      setSaving(false)
    }
  }

  const handleInstall = async () => {
    if (!hasUpdateApi) return
    await window.api.installUpdate()
  }

  return (
    <div className="page-shell px-6 py-8">
      <div className="panel panel-glow p-6 mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Rocket className="text-sky-200" size={28} />
          <div>
            <h1 className="title-display text-2xl">更新中心</h1>
            <p className="text-sm text-slate-400">檢查、下載並自動更新 OwlStarter</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-ghost text-sm inline-flex items-center gap-2" onClick={handleCheck} disabled={saving}>
            <RefreshCw size={16} />
            檢查更新
          </button>
          {state.status === 'available' && (
            <button className="btn-accent text-sm inline-flex items-center gap-2" onClick={handleDownload} disabled={saving}>
              <Download size={16} />
              下載更新
            </button>
          )}
          {state.status === 'downloaded' && (
            <button className="btn-primary text-sm inline-flex items-center gap-2" onClick={handleInstall}>
              <ShieldCheck size={16} />
              立即安裝
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="panel p-5 xl:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle2 className="text-emerald-200" />
            <h2 className="title-display text-lg">更新狀態</h2>
          </div>
          <div className="panel-soft p-4 flex flex-col gap-2">
            <div className="text-sm text-slate-200">{statusLabel}</div>
            {state.status === 'downloading' && (
              <div className="w-full h-2 rounded-full bg-[#0b1526] border border-[#1a2740] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-400 to-teal-300"
                  style={{ width: `${state.progress ?? 0}%` }}
                />
              </div>
            )}
            {state.releaseNotes && (
              <div className="text-xs text-slate-400 whitespace-pre-line">
                {state.releaseNotes}
              </div>
            )}
            {state.message && (
              <div className="text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle size={14} />
                {state.message}
              </div>
            )}
          </div>
        </div>

        <div className="panel p-5">
          <div className="flex items-center gap-3 mb-4">
            <ShieldCheck className="text-sky-200" />
            <h2 className="title-display text-lg">自動更新</h2>
          </div>
          <div className="space-y-3 text-sm text-slate-300">
            <label className="flex items-center justify-between panel-soft px-4 py-3">
              <span>自動檢查更新</span>
              <input
                type="checkbox"
                className="accent-sky-400"
                checked={autoCheck}
                onChange={(event) => setAutoCheck(event.target.checked)}
              />
            </label>
            <label className="flex items-center justify-between panel-soft px-4 py-3">
              <span>自動下載更新</span>
              <input
                type="checkbox"
                className="accent-sky-400"
                checked={autoDownload}
                onChange={(event) => setAutoDownload(event.target.checked)}
              />
            </label>
            <label className="flex flex-col gap-2 panel-soft px-4 py-3">
              <span>檢查頻率</span>
              <input
                type="range"
                min={1}
                max={12}
                value={Math.round(intervalMs / (60 * 60 * 1000))}
                onChange={(event) => setIntervalMs(Number(event.target.value) * 60 * 60 * 1000)}
              />
              <div className="text-xs text-slate-400">{intervalLabel}</div>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Updates

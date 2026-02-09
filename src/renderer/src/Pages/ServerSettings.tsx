import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, ArrowLeft, UserPlus, Shield, UserX } from 'lucide-react'

function ServerSettings({ serverId }: { serverId?: string }) {
  const navigate = useNavigate()
  const [configContent, setConfigContent] = useState('')
  const [motd, setMotd] = useState('OwlStarter Server')
  const [onlineMode, setOnlineMode] = useState(true)
  const [pvp, setPvp] = useState(true)
  const [whitelist, setWhitelist] = useState(true)
  const [gameMode, setGameMode] = useState('survival')
  const [difficulty, setDifficulty] = useState('normal')
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [whitelistMembers, setWhitelistMembers] = useState<string[]>([])
  const [opMembers, setOpMembers] = useState<string[]>([])
  const [bannedMembers, setBannedMembers] = useState<string[]>([])
  const [whitelistInput, setWhitelistInput] = useState('')
  const [opInput, setOpInput] = useState('')
  const [bannedInput, setBannedInput] = useState('')
  const [memberError, setMemberError] = useState('')

  const insertMotdCode = (code: string) => {
    setMotd((prev) => `${prev}${code}`)
  }

  const renderMotdPreview = (text: string) => {
    const segments: Array<{ text: string; style: React.CSSProperties }> = []
    let currentStyle: React.CSSProperties = {}
    let buffer = ''
    const colorMap: Record<string, string> = {
      '0': '#000000',
      '1': '#0000AA',
      '2': '#00AA00',
      '3': '#00AAAA',
      '4': '#AA0000',
      '5': '#AA00AA',
      '6': '#FFAA00',
      '7': '#AAAAAA',
      '8': '#555555',
      '9': '#5555FF',
      a: '#55FF55',
      b: '#55FFFF',
      c: '#FF5555',
      d: '#FF55FF',
      e: '#FFFF55',
      f: '#FFFFFF'
    }
    const flush = () => {
      if (buffer) {
        segments.push({ text: buffer, style: { ...currentStyle } })
        buffer = ''
      }
    }
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i]
      if (char === '§' && i + 1 < text.length) {
        const code = text[i + 1].toLowerCase()
        flush()
        if (colorMap[code]) {
          currentStyle = { ...currentStyle, color: colorMap[code] }
        } else if (code === 'l') {
          currentStyle = { ...currentStyle, fontWeight: 700 }
        } else if (code === 'r') {
          currentStyle = {}
        }
        i += 1
        continue
      }
      buffer += char
    }
    flush()
    return segments
  }

  const loadConfig = async () => {
    if (!serverId) return
    const res = await window.api.getServerConfig(Number(serverId))
    setConfigContent(res.content ?? '')
  }

  useEffect(() => {
    loadConfig()
  }, [serverId])

  useEffect(() => {
    return () => {
      localStorage.removeItem('activeServerId')
    }
  }, [])

  useEffect(() => {
    const loadMembers = async () => {
      if (!serverId) return
      const [whitelistRes, opRes, bannedRes] = await Promise.all([
        window.api.listMembers(Number(serverId), 'whitelist'),
        window.api.listMembers(Number(serverId), 'ops'),
        window.api.listMembers(Number(serverId), 'banned')
      ])
      setWhitelistMembers(whitelistRes?.members ?? [])
      setOpMembers(opRes?.members ?? [])
      setBannedMembers(bannedRes?.members ?? [])
    }
    loadMembers()
  }, [serverId])

  useEffect(() => {
    if (!configContent) return
    const map: Record<string, string> = {}
    for (const line of configContent.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const idx = trimmed.indexOf('=')
      if (idx === -1) continue
      const key = trimmed.slice(0, idx).trim()
      const value = trimmed.slice(idx + 1).trim()
      map[key] = value
    }
    setMotd(map['motd'] ?? 'OwlStarter Server')
    setOnlineMode(map['online-mode'] ? map['online-mode'] === 'true' : true)
    setPvp(map['pvp'] ? map['pvp'] === 'true' : true)
    setWhitelist(map['white-list'] ? map['white-list'] === 'true' : true)
    setGameMode(map['gamemode'] ?? 'survival')
    setDifficulty(map['difficulty'] ?? 'normal')
  }, [configContent])

  const saveSettings = async () => {
    if (!serverId) return
    setSaveMessage('')
    const map: Record<string, string> = {}
    for (const line of configContent.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const idx = trimmed.indexOf('=')
      if (idx === -1) continue
      const key = trimmed.slice(0, idx).trim()
      const value = trimmed.slice(idx + 1).trim()
      map[key] = value
    }
    map['motd'] = motd
    map['online-mode'] = String(onlineMode)
    map['pvp'] = String(pvp)
    map['white-list'] = String(whitelist)
    map['gamemode'] = gameMode
    map['difficulty'] = difficulty
    const merged = Object.entries(map)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')
    setSaving(true)
    try {
      await window.api.updateServerConfig(Number(serverId), merged)
      setConfigContent(merged)
      setSaveMessage('儲存成功')
      setTimeout(() => setSaveMessage(''), 3000)
    } finally {
      setSaving(false)
    }
  }

  const addMember = async (type: 'whitelist' | 'ops' | 'banned', name: string) => {
    if (!serverId || !name) return
    setMemberError('')
    try {
      await window.api.addMember(Number(serverId), type, name)
      const res = await window.api.listMembers(Number(serverId), type)
      if (type === 'whitelist') setWhitelistMembers(res?.members ?? [])
      if (type === 'ops') setOpMembers(res?.members ?? [])
      if (type === 'banned') setBannedMembers(res?.members ?? [])
    } catch (error) {
      setMemberError(error instanceof Error ? error.message : '操作失敗')
    }
  }

  const removeMember = async (type: 'whitelist' | 'ops' | 'banned', name: string) => {
    if (!serverId || !name) return
    setMemberError('')
    try {
      await window.api.removeMember(Number(serverId), type, name)
      const res = await window.api.listMembers(Number(serverId), type)
      if (type === 'whitelist') setWhitelistMembers(res?.members ?? [])
      if (type === 'ops') setOpMembers(res?.members ?? [])
      if (type === 'banned') setBannedMembers(res?.members ?? [])
    } catch (error) {
      setMemberError(error instanceof Error ? error.message : '操作失敗')
    }
  }

  return (
    <div className="page-shell px-6 py-8">
      <div className="panel panel-glow p-5 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="text-sky-200" />
          <div>
            <h1 className="title-display text-2xl">伺服器設置</h1>
            <p className="text-sm text-slate-400">設定 MOTD、模式、白名單與線上驗證</p>
          </div>
        </div>
        <button className="btn-ghost text-sm inline-flex items-center gap-2" onClick={() => navigate(`/server/manage/${serverId}`)}>
          <ArrowLeft size={16} />
          返回管理
        </button>
      </div>

      <div className="panel p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-300">
        <div className="md:col-span-2">
          <label className="text-xs text-slate-400">MOTD</label>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-300">
            <button className="btn-ghost text-xs px-2 py-1" type="button" onClick={() => insertMotdCode('§l')}>
              粗體
            </button>
            <button className="btn-ghost text-xs px-2 py-1" type="button" onClick={() => insertMotdCode('§r')}>
              重置
            </button>
            {[
              { code: 'a', label: '綠' },
              { code: 'b', label: '青' },
              { code: 'c', label: '紅' },
              { code: 'e', label: '黃' },
              { code: 'f', label: '白' }
            ].map((item) => (
              <button
                key={item.code}
                className="btn-ghost text-xs px-2 py-1"
                type="button"
                onClick={() => insertMotdCode(`§${item.code}`)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={motd}
            onChange={(event) => setMotd(event.target.value)}
            className="mt-2 w-full bg-[#0b1526] border border-[#1a2740] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
          />
          <div className="mt-2 panel-soft px-3 py-2 text-sm">
            {renderMotdPreview(motd).map((seg, idx) => (
              <span key={idx} style={seg.style}>{seg.text}</span>
            ))}
          </div>
          <div className="text-xs text-slate-400 mt-1">使用 Minecraft 格式碼（例如 §a 綠色、§l 粗體、§r 重置）</div>
        </div>
        <div>
          <label className="text-xs text-slate-400">遊戲模式</label>
          <select
            className="mt-2 w-full bg-[#0b1526] border border-[#1a2740] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
            value={gameMode}
            onChange={(event) => setGameMode(event.target.value)}
          >
            <option value="survival">生存</option>
            <option value="creative">創造</option>
            <option value="adventure">冒險</option>
            <option value="spectator">旁觀</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-400">難度</label>
          <select
            className="mt-2 w-full bg-[#0b1526] border border-[#1a2740] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value)}
          >
            <option value="normal">普通</option>
            <option value="easy">簡單</option>
            <option value="hard">困難</option>
            <option value="peaceful">和平</option>
          </select>
        </div>
        <div className="md:col-span-2 flex flex-wrap gap-3">
          <label className="flex items-center gap-2 panel-soft px-3 py-2">
            <input type="checkbox" className="accent-sky-400" checked={pvp} onChange={(event) => setPvp(event.target.checked)} />
            允許 PvP
          </label>
          <label className="flex items-center gap-2 panel-soft px-3 py-2">
            <input type="checkbox" className="accent-sky-400" checked={whitelist} onChange={(event) => setWhitelist(event.target.checked)} />
            啟用白名單
          </label>
          <label className="flex items-center gap-2 panel-soft px-3 py-2">
            <input type="checkbox" className="accent-sky-400" checked={onlineMode} onChange={(event) => setOnlineMode(event.target.checked)} />
            線上驗證
          </label>
        </div>
        <div className="md:col-span-2 flex justify-end">
          <button className="btn-primary" onClick={saveSettings} disabled={saving}>
            {saving ? '儲存中...' : '儲存設置'}
          </button>
        </div>
      </div>
      <div className={`toast toast-${saveMessage ? 'show' : 'hide'}`}>
        {saveMessage}
      </div>
{/* 
      <div className="panel p-4 mt-6">
        <div className="mb-3 text-lg title-display flex items-center gap-2">
          <UserPlus className="text-sky-200" />
          成員管理
        </div>
        {memberError && <div className="mb-3 panel-soft text-rose-300 text-sm px-3 py-2">{memberError}</div>}

        {whitelist && (
          <div className="mb-6">
            <div className="text-sm text-slate-400 mb-2">白名單成員</div>
            <div className="flex gap-2 mb-2">
              <input
                className="flex-1 bg-[#0b1526] border border-[#1a2740] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
                placeholder="玩家名稱"
                value={whitelistInput}
                onChange={(event) => setWhitelistInput(event.target.value)}
              />
              <button
                className="btn-ghost text-sm"
                onClick={() => {
                  addMember('whitelist', whitelistInput)
                  setWhitelistInput('')
                }}
              >
                加入
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {whitelistMembers.map((name) => (
                <button
                  key={name}
                  className="panel-soft px-3 py-1 text-sm"
                  onClick={() => removeMember('whitelist', name)}
                  title="點擊移除"
                >
                  {name}
                </button>
              ))}
              {whitelistMembers.length === 0 && <div className="text-xs text-slate-400">尚無白名單成員</div>}
            </div>
          </div>
        )}

        <div className="mb-6">
          <div className="text-sm text-slate-400 mb-2 flex items-center gap-2">
            <Shield size={14} />
            OP 成員
          </div>
          <div className="flex gap-2 mb-2">
            <input
              className="flex-1 bg-[#0b1526] border border-[#1a2740] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
              placeholder="玩家名稱"
              value={opInput}
              onChange={(event) => setOpInput(event.target.value)}
            />
            <button
              className="btn-ghost text-sm"
              onClick={() => {
                addMember('ops', opInput)
                setOpInput('')
              }}
            >
              加入
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {opMembers.map((name) => (
              <button
                key={name}
                className="panel-soft px-3 py-1 text-sm"
                onClick={() => removeMember('ops', name)}
                title="點擊移除"
              >
                {name}
              </button>
            ))}
            {opMembers.length === 0 && <div className="text-xs text-slate-400">尚無 OP 成員</div>}
          </div>
        </div>

        <div>
          <div className="text-sm text-slate-400 mb-2 flex items-center gap-2">
            <UserX size={14} />
            封鎖成員
          </div>
          <div className="flex gap-2 mb-2">
            <input
              className="flex-1 bg-[#0b1526] border border-[#1a2740] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
              placeholder="玩家名稱"
              value={bannedInput}
              onChange={(event) => setBannedInput(event.target.value)}
            />
            <button
              className="btn-ghost text-sm"
              onClick={() => {
                addMember('banned', bannedInput)
                setBannedInput('')
              }}
            >
              加入
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {bannedMembers.map((name) => (
              <button
                key={name}
                className="panel-soft px-3 py-1 text-sm"
                onClick={() => removeMember('banned', name)}
                title="點擊移除"
              >
                {name}
              </button>
            ))}
            {bannedMembers.length === 0 && <div className="text-xs text-slate-400">尚無封鎖成員</div>}
          </div>
        </div>
      </div> */}
    </div>
  )
}

export default ServerSettings

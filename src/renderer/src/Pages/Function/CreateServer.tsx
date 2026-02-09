import { useEffect, useMemo, useState } from 'react'
import {
  Rocket,
  Server,
  Cpu,
  HardDrive,
  Globe,
  Users,
  Shield,
  Zap,
  Settings,
  CheckCircle2
} from 'lucide-react'

type McJarType = 'vanilla' | 'servers' | 'modded' | 'bedrock' | 'proxies'
type McJarPlatform = 'windows' | 'linux'

const TYPE_OPTIONS: Array<{
  type: McJarType
  label: string
  variants: Array<{ value: string; label: string }>
  platforms?: Array<{ value: McJarPlatform; label: string }>
}> = [
  {
    type: 'vanilla',
    label: 'Vanilla',
    variants: [
      { value: 'release', label: 'Release' },
      { value: 'snapshot', label: 'Snapshot' }
    ]
  },
  {
    type: 'servers',
    label: 'Servers',
    variants: [
      { value: 'paper', label: 'Paper' },
      { value: 'purpur', label: 'Purpur' }
    ]
  },
  {
    type: 'modded',
    label: 'Modded',
    variants: [
      { value: 'fabric', label: 'Fabric' },
      { value: 'forge', label: 'Forge' },
      { value: 'neoforge', label: 'NeoForge' }
    ]
  },
  {
    type: 'proxies',
    label: 'Proxies',
    variants: [{ value: 'velocity', label: 'Velocity' }]
  },
  {
    type: 'bedrock',
    label: 'Bedrock',
    variants: [
      { value: 'latest', label: 'Latest' },
      { value: 'preview', label: 'Preview' }
    ],
    platforms: [
      { value: 'windows', label: 'Windows' },
      { value: 'linux', label: 'Linux' }
    ]
  }
]

function CreateServer() {
  const [name, setName] = useState('像素創世紀')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<McJarType>('servers')
  const [variant, setVariant] = useState('paper')
  const [platform, setPlatform] = useState<McJarPlatform>('windows')
  const [versions, setVersions] = useState<string[]>([])
  const [version, setVersion] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(20)
  const [port, setPort] = useState(25565)
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [versionError, setVersionError] = useState('')
  const [creating, setCreating] = useState(false)
  const [createMessage, setCreateMessage] = useState('')

  const selectedType = useMemo(() => TYPE_OPTIONS.find((item) => item.type === type), [type])

  useEffect(() => {
    if (!selectedType) {
      return
    }
    if (!selectedType.variants.find((item) => item.value === variant)) {
      setVariant(selectedType.variants[0]?.value ?? '')
    }
  }, [selectedType, variant])

  useEffect(() => {
    const loadVersions = async () => {
      setLoadingVersions(true)
      setVersionError('')
      try {
        const result = await window.api.getJarVersions({
          type,
          variant,
          platform: type === 'bedrock' ? platform : undefined
        })
        setVersions(result)
        setVersion(result[0] ?? '')
      } catch (error) {
        setVersionError('無法取得版本清單，請檢查網路或 API 狀態。')
        setVersions([])
        setVersion('')
      } finally {
        setLoadingVersions(false)
      }
    }

    if (variant) {
      loadVersions()
    }
  }, [type, variant, platform])

  const handleCreate = async () => {
    if (!name || !variant || !version) {
      setCreateMessage('請補齊伺服器名稱、核心與版本。')
      return
    }
    setCreating(true)
    setCreateMessage('')
    try {
      await window.api.createServer({
        name,
        type,
        variant,
        version,
        platform: type === 'bedrock' ? platform : undefined,
        port,
        maxPlayers,
        description,
        settings: JSON.stringify({
          gameMode: 'survival',
          difficulty: 'normal',
          pvp: true,
          whitelist: true,
          onlineMode: true
        })
      })
      setCreateMessage('伺服器已建立，正在下載 JAR 檔案。')
    } catch (error) {
      setCreateMessage('建立失敗，請稍後再試。')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="page-shell px-6 py-8 overflow-auto scrollbar-theme">
      {/* 頂部標題 */}
      <header className="panel panel-glow flex flex-col gap-4 mb-6 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <Rocket className="text-sky-200" size={28} />
            <div>
              <h1 className="title-display text-2xl">創建伺服器</h1>
              <p className="text-sm text-slate-400 mt-1">像遊戲啟動器一樣快速打造你的世界</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-ghost text-sm">
              儲存草稿
            </button>
            <button
              className="btn-accent text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={handleCreate}
              disabled={creating}
            >
              {creating ? '建立中...' : '立即部署'}
            </button>
          </div>
        </div>
        {createMessage && <div className="text-sm text-sky-300">{createMessage}</div>}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: '伺服器規格', desc: '選擇核心與記憶體' },
            { label: '遊戲版本', desc: '挑選核心與模組' },
            { label: '世界設定', desc: '建立地圖與規則' },
            { label: '上線準備', desc: '安全與玩家' }
          ].map((step, index) => (
            <div key={step.label} className="panel-soft p-3">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <span className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-200 flex items-center justify-center text-xs">
                  {index + 1}
                </span>
                <span className="font-semibold">{step.label}</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">{step.desc}</div>
            </div>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 flex flex-col gap-6">
          <section className="panel p-5">
              <div className="flex items-center gap-2 mb-4">
                <Server className="text-emerald-200" size={20} />
                <h2 className="text-lg title-display">伺服器基本資訊</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                <div>
                  <label className="text-sm text-slate-400">伺服器名稱</label>
                  <input
                    type="text"
                    placeholder="像素創世紀"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="mt-2 w-full bg-[#0b1526] border border-[#1a2740] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
                  />
                </div>
                {/* <div>
                  <label className="text-sm text-gray-400">伺服器位置</label>
                  <select className="mt-2 w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                    <option>台北</option>
                    <option>東京</option>
                    <option>新加坡</option>
                    <option>法蘭克福</option>
                  </select>
                </div> */}
                <div className="md:col-span-2">
                  <label className="text-sm text-slate-400">伺服器描述</label>
                  <textarea
                    rows={3}
                    placeholder="一句話描述你的伺服器主題與特色"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className="mt-2 w-full bg-[#0b1526] border border-[#1a2740] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400 resize-none"
                  />
                </div>
              </div>
          </section>

            <section className="panel p-5">
              <div className="flex items-center gap-2 mb-4">
                <Cpu className="text-amber-200" size={20} />
                <h2 className="text-lg title-display">效能規劃</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: 'CPU 核心', value: '4 核', hint: '中型世界' },
                  { label: '記憶體', value: '8 GB', hint: '10-20 人' },
                  { label: '磁碟', value: '50 GB', hint: 'SSD' }
                ].map((item) => (
                  <div key={item.label} className="panel-soft p-4">
                    <div className="text-sm text-slate-400">{item.label}</div>
                    <div className="text-xl title-display mt-2">{item.value}</div>
                    <div className="text-xs text-slate-400 mt-1">{item.hint}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="text-sm text-slate-400">最大玩家數</label>
                  <input
                    type="number"
                    value={maxPlayers}
                    onChange={(event) => setMaxPlayers(Number(event.target.value))}
                    className="mt-2 w-full bg-[#0b1526] border border-[#1a2740] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400">預設連接埠</label>
                  <input
                    type="number"
                    value={port}
                    onChange={(event) => setPort(Number(event.target.value))}
                    className="mt-2 w-full bg-[#0b1526] border border-[#1a2740] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
                  />
                </div>
              </div>
            </section>

            <section className="panel p-5">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="text-sky-200" size={20} />
                <h2 className="text-lg title-display">世界與玩法</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-400">遊戲核心</label>
                  <select
                    className="mt-2 w-full bg-[#0b1526] border border-[#1a2740] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
                    value={type}
                    onChange={(event) => setType(event.target.value as McJarType)}
                  >
                    {TYPE_OPTIONS.map((item) => (
                      <option key={item.type} value={item.type}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-slate-400">變體</label>
                  <select
                    className="mt-2 w-full bg-[#0b1526] border border-[#1a2740] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
                    value={variant}
                    onChange={(event) => setVariant(event.target.value)}
                  >
                    {(selectedType?.variants ?? []).map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
                {type === 'bedrock' && (
                  <div>
                    <label className="text-sm text-slate-400">平台</label>
                    <select
                      className="mt-2 w-full bg-[#0b1526] border border-[#1a2740] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
                      value={platform}
                      onChange={(event) => setPlatform(event.target.value as McJarPlatform)}
                    >
                      {(selectedType?.platforms ?? []).map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-sm text-slate-400">版本</label>
                  <select
                    className="mt-2 w-full bg-[#0b1526] border border-[#1a2740] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
                    value={version}
                    onChange={(event) => setVersion(event.target.value)}
                    disabled={loadingVersions || versions.length === 0}
                  >
                    {loadingVersions && <option>載入中...</option>}
                    {!loadingVersions && versions.length === 0 && <option>無可用版本</option>}
                    {versions.map((ver) => (
                      <option key={ver} value={ver}>
                        {ver}
                      </option>
                    ))}
                  </select>
                  {versionError && <div className="text-xs text-rose-300 mt-2">{versionError}</div>}
                </div>
                <div>
                  <label className="text-sm text-slate-400">遊戲模式</label>
                  <select className="mt-2 w-full bg-[#0b1526] border border-[#1a2740] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400">
                    <option>生存</option>
                    <option>創造</option>
                    <option>冒險</option>
                    <option>旁觀</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-slate-400">難度</label>
                  <select className="mt-2 w-full bg-[#0b1526] border border-[#1a2740] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400">
                    <option>普通</option>
                    <option>簡單</option>
                    <option>困難</option>
                    <option>和平</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                {[
                  { label: '允許 PvP', icon: Zap },
                  { label: '啟用白名單', icon: Users },
                  { label: '線上驗證', icon: Shield }
                ].map(({ label, icon: Icon }) => (
                  <label key={label} className="flex items-center gap-3 panel-soft px-3 py-2 text-sm cursor-pointer">
                    <input type="checkbox" className="accent-sky-400" defaultChecked />
                    <Icon size={16} className="text-sky-200" />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </section>

            <section className="panel p-5">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="text-violet-200" size={20} />
                <h2 className="text-lg title-display">啟動行為</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center justify-between panel-soft px-4 py-3 text-sm">
                  <span>建立後立即啟動伺服器</span>
                  <input type="checkbox" className="accent-sky-400" defaultChecked />
                </label>
                <label className="flex items-center justify-between panel-soft px-4 py-3 text-sm">
                  <span>安裝推薦插件包</span>
                  <input type="checkbox" className="accent-sky-400" />
                </label>
                <label className="flex items-center justify-between panel-soft px-4 py-3 text-sm">
                  <span>啟用自動備份</span>
                  <input type="checkbox" className="accent-sky-400" defaultChecked />
                </label>
                <label className="flex items-center justify-between panel-soft px-4 py-3 text-sm">
                  <span>開放公開列表</span>
                  <input type="checkbox" className="accent-sky-400" />
                </label>
              </div>
            </section>
          </div>

          <aside className="flex flex-col gap-6">
            <div className="panel p-5">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="text-emerald-200" size={20} />
                <h2 className="text-lg title-display">部署預覽</h2>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">核心版本</span>
                  <span>{`${variant} ${version || '-'}`}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">資源</span>
                  <span>4 核 / 8 GB</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">玩家上限</span>
                  <span>{maxPlayers} 人</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">世界類型</span>
                  <span>生存</span>
                </div>
              </div>
              <div className="mt-4 panel-soft p-3 text-xs text-slate-400">
                預估部署時間約 2-3 分鐘，完成後可立即進入控制台。
              </div>
            </div>

            <div className="panel p-5">
              <div className="flex items-center gap-2 mb-4">
                <HardDrive className="text-amber-200" size={20} />
                <h2 className="text-lg title-display">創業方案</h2>
              </div>
              <div className="space-y-3">
                {[
                  { title: '新手冒險包', desc: '預設生存 + 基礎插件', badge: '熱門' },
                  { title: '創作者基地', desc: '創造模式 + 世界保護', badge: '推薦' },
                  { title: '競技擂台', desc: 'PvP + 低延遲配置', badge: '快速' }
                ].map((pack) => (
                  <div key={pack.title} className="panel-soft p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">{pack.title}</div>
                      <span className="text-xs text-sky-200 bg-sky-500/10 px-2 py-1 rounded-full">
                        {pack.badge}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">{pack.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel p-5">
              <div className="flex items-center gap-2 mb-4">
                <Users className="text-teal-200" size={20} />
                <h2 className="text-lg title-display">招募計畫</h2>
              </div>
              <div className="space-y-3 text-sm text-slate-400">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-sky-300 mt-1.5" />
                  <span>開啟新玩家導覽與新手禮包</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-sky-300 mt-1.5" />
                  <span>設定 Discord 連結與公告頻道</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-sky-300 mt-1.5" />
                  <span>啟用每日備份確保資料安全</span>
                </div>
              </div>
            </div>
          </aside>
      </div>
    </div>
  )
}

export default CreateServer
